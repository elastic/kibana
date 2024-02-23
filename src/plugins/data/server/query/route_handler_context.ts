/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { badRequest, internal, conflict } from '@hapi/boom';
import type {
  CustomRequestHandlerContext,
  RequestHandlerContext,
  SavedObject,
} from '@kbn/core/server';
import { escapeKuery, escapeQuotes, isFilters, isOfQueryType } from '@kbn/es-query';
import { omit } from 'lodash';
import { isQuery, SavedQueryAttributes } from '../../common';
import { extract, inject } from '../../common/query/filters/persistable_state';
import type { SavedQueryRestResponse } from './route_types';

export interface InternalSavedQueryAttributes
  extends Omit<SavedQueryAttributes, 'filters' | 'timefilter'> {
  titleKeyword: string;
  filters?: SavedQueryAttributes['filters'] | null;
  timefilter?: SavedQueryAttributes['timefilter'] | null;
}

function injectReferences({
  id,
  attributes: internalAttributes,
  namespaces,
  references,
}: Pick<
  SavedObject<InternalSavedQueryAttributes>,
  'id' | 'attributes' | 'namespaces' | 'references'
>) {
  const attributes: SavedQueryAttributes = omit(
    internalAttributes,
    'titleKeyword',
    'filters',
    'timefilter'
  );

  // filters or timefilter can be null if previously removed in an update,
  // which isn't valid for the client model, so we conditionally add them
  if (internalAttributes.filters) {
    attributes.filters = inject(internalAttributes.filters, references);
  }

  if (internalAttributes.timefilter) {
    attributes.timefilter = internalAttributes.timefilter;
  }

  const { query } = attributes;
  if (isOfQueryType(query) && typeof query.query === 'string') {
    try {
      const parsed = JSON.parse(query.query);
      query.query = parsed instanceof Object ? parsed : query.query;
    } catch (e) {
      // Just keep it as a string
    }
  }

  return { id, attributes, namespaces };
}

function extractReferences({
  title,
  description,
  query,
  filters,
  timefilter,
}: SavedQueryAttributes) {
  const { state: extractedFilters, references } = filters
    ? extract(filters)
    : { state: undefined, references: [] };

  const isOfQueryTypeQuery = isOfQueryType(query);
  let queryString = '';
  if (isOfQueryTypeQuery) {
    if (typeof query.query === 'string') {
      queryString = query.query;
    } else {
      queryString = JSON.stringify(query.query);
    }
  }

  const attributes: InternalSavedQueryAttributes = {
    title: title.trim(),
    titleKeyword: title.trim(),
    description: description.trim(),
    query: {
      ...query,
      ...(queryString && { query: queryString }),
    },
    // Pass null instead of undefined for filters and timefilter
    // to ensure they are removed from the saved object on update
    // since the saved objects client ignores undefined values
    filters: extractedFilters ?? null,
    timefilter: timefilter ?? null,
  };

  return { attributes, references };
}

function verifySavedQuery({ title, query, filters = [] }: SavedQueryAttributes) {
  if (!isQuery(query)) {
    throw badRequest(`Invalid query: ${JSON.stringify(query, null, 2)}`);
  }

  if (!isFilters(filters)) {
    throw badRequest(`Invalid filters: ${JSON.stringify(filters, null, 2)}`);
  }

  if (!title.trim().length) {
    throw badRequest('Cannot create query without a title');
  }
}

export async function registerSavedQueryRouteHandlerContext(context: RequestHandlerContext) {
  const soClient = (await context.core).savedObjects.client;

  const isDuplicateTitle = async ({ title, id }: { title: string; id?: string }) => {
    const preparedTitle = title.trim();
    const { saved_objects: savedQueries } = await soClient.find<InternalSavedQueryAttributes>({
      type: 'query',
      page: 1,
      perPage: 1,
      filter: `query.attributes.titleKeyword:"${escapeQuotes(preparedTitle)}"`,
    });
    const existingQuery = savedQueries[0];

    return Boolean(
      existingQuery &&
        existingQuery.attributes.titleKeyword === preparedTitle &&
        (!id || existingQuery.id !== id)
    );
  };

  const validateSavedQueryTitle = async (title: string, id?: string) => {
    if (await isDuplicateTitle({ title, id })) {
      throw badRequest(`Query with title "${title.trim()}" already exists`);
    }
  };

  const createSavedQuery = async (attrs: SavedQueryAttributes): Promise<SavedQueryRestResponse> => {
    verifySavedQuery(attrs);
    await validateSavedQueryTitle(attrs.title);

    const { attributes, references } = extractReferences(attrs);
    const savedObject = await soClient.create<InternalSavedQueryAttributes>('query', attributes, {
      references,
    });

    // TODO: Handle properly
    if (savedObject.error) throw internal(savedObject.error.message);

    return injectReferences(savedObject);
  };

  const updateSavedQuery = async (
    id: string,
    attrs: SavedQueryAttributes
  ): Promise<SavedQueryRestResponse> => {
    verifySavedQuery(attrs);
    await validateSavedQueryTitle(attrs.title, id);

    const { attributes, references } = extractReferences(attrs);
    const savedObject = await soClient.update<InternalSavedQueryAttributes>(
      'query',
      id,
      attributes,
      {
        references,
      }
    );

    // TODO: Handle properly
    if (savedObject.error) throw internal(savedObject.error.message);

    return injectReferences({ id, attributes, references });
  };

  const getSavedQuery = async (id: string): Promise<SavedQueryRestResponse> => {
    const { saved_object: savedObject, outcome } =
      await soClient.resolve<InternalSavedQueryAttributes>('query', id);
    if (outcome === 'conflict') {
      throw conflict(`Multiple saved queries found with ID: ${id} (legacy URL alias conflict)`);
    } else if (savedObject.error) {
      throw internal(savedObject.error.message);
    }
    return injectReferences(savedObject);
  };

  const getSavedQueriesCount = async () => {
    const { total } = await soClient.find<InternalSavedQueryAttributes>({
      type: 'query',
      page: 0,
      perPage: 0,
    });
    return total;
  };

  const findSavedQueries = async ({ page = 1, perPage = 50, search = '' } = {}): Promise<{
    total: number;
    savedQueries: SavedQueryRestResponse[];
  }> => {
    const cleanedSearch = search.replace(/\W/g, ' ').trim();
    const preparedSearch = escapeKuery(cleanedSearch).split(/\s+/).join(' AND ');
    const { total, saved_objects: savedObjects } =
      await soClient.find<InternalSavedQueryAttributes>({
        type: 'query',
        page,
        perPage,
        filter: preparedSearch.length ? `query.attributes.title:(*${preparedSearch}*)` : undefined,
        sortField: 'titleKeyword',
        sortOrder: 'asc',
      });

    const savedQueries = savedObjects.map(injectReferences);

    return { total, savedQueries };
  };

  const deleteSavedQuery = async (id: string) => {
    return await soClient.delete('query', id, { force: true });
  };

  return {
    isDuplicateTitle,
    create: createSavedQuery,
    update: updateSavedQuery,
    get: getSavedQuery,
    count: getSavedQueriesCount,
    find: findSavedQueries,
    delete: deleteSavedQuery,
  };
}

export type SavedQueryRouteHandlerContext = CustomRequestHandlerContext<{
  savedQuery: Promise<ReturnType<typeof registerSavedQueryRouteHandlerContext>>;
}>;
