/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomRequestHandlerContext, RequestHandlerContext, SavedObject } from '@kbn/core/server';
import { isFilters, isOfQueryType } from '@kbn/es-query';
import { isQuery, SavedQueryAttributes } from '../../common';
import { extract, inject } from '../../common/query/filters/persistable_state';

function injectReferences({
  id,
  attributes,
  references,
}: Pick<SavedObject<SavedQueryAttributes>, 'id' | 'attributes' | 'references'>) {
  const { query } = attributes;
  if (isOfQueryType(query) && typeof query.query === 'string') {
    try {
      const parsed = JSON.parse(query.query);
      query.query = parsed instanceof Object ? parsed : query.query;
    } catch (e) {
      // Just keep it as a string
    }
  }
  const filters = inject(attributes.filters ?? [], references);
  return { id, attributes: { ...attributes, filters } };
}

function extractReferences({
  title,
  description,
  query,
  filters = [],
  timefilter,
}: SavedQueryAttributes) {
  const { state: extractedFilters, references } = extract(filters);
  const isOfQueryTypeQuery = isOfQueryType(query);
  let queryString = '';
  if (isOfQueryTypeQuery) {
    if (typeof query.query === 'string') {
      queryString = query.query;
    } else {
      queryString = JSON.stringify(query.query);
    }
  }

  const attributes: SavedQueryAttributes = {
    title: title.trim(),
    description: description.trim(),
    query: {
      ...query,
      ...(queryString && { query: queryString }),
    },
    filters: extractedFilters,
    ...(timefilter && { timefilter }),
  };

  return { attributes, references };
}

function verifySavedQuery({ title, query, filters = [] }: SavedQueryAttributes) {
  if (!isQuery(query)) {
    throw new Error(`Invalid query: ${query}`);
  }

  if (!isFilters(filters)) {
    throw new Error(`Invalid filters: ${filters}`);
  }

  if (!title.trim().length) {
    throw new Error('Cannot create saved query without a title');
  }
}

export async function registerSavedQueryRouteHandlerContext(context: RequestHandlerContext) {
  const soClient = (await context.core).savedObjects.client;

  const createSavedQuery = async (attrs: SavedQueryAttributes) => {
    verifySavedQuery(attrs);
    const { attributes, references } = extractReferences(attrs);

    const savedObject = await soClient.create<SavedQueryAttributes>('query', attributes, {
      references,
    });

    // TODO: Handle properly
    if (savedObject.error) throw new Error(savedObject.error.message);

    return injectReferences(savedObject);
  };

  const updateSavedQuery = async (id: string, attrs: SavedQueryAttributes) => {
    verifySavedQuery(attrs);
    const { attributes, references } = extractReferences(attrs);

    const savedObject = await soClient.update<SavedQueryAttributes>('query', id, attributes, {
      references,
    });

    // TODO: Handle properly
    if (savedObject.error) throw new Error(savedObject.error.message);

    return injectReferences({ id, attributes, references });
  };

  const getSavedQuery = async (id: string) => {
    const { saved_object: savedObject, outcome } = await soClient.resolve<SavedQueryAttributes>(
      'query',
      id
    );
    if (outcome === 'conflict') {
      throw new Error(`Multiple saved queries found with ID: ${id} (legacy URL alias conflict)`);
    } else if (savedObject.error) {
      throw new Error(savedObject.error.message);
    }
    return injectReferences(savedObject);
  };

  const getSavedQueriesCount = async () => {
    const { total } = await soClient.find<SavedQueryAttributes>({
      type: 'query',
    });
    return total;
  };

  const findSavedQueries = async ({ page = 1, perPage = 50, search = '' } = {}) => {
    const { total, saved_objects: savedObjects } = await soClient.find<SavedQueryAttributes>({
      type: 'query',
      page,
      perPage,
      search,
    });

    const savedQueries = savedObjects.map(injectReferences);

    return { total, savedQueries };
  };

  const getAllSavedQueries = async () => {
    const finder = soClient.createPointInTimeFinder<SavedQueryAttributes>({
      type: 'query',
      perPage: 100,
    });

    const savedObjects: Array<SavedObject<SavedQueryAttributes>> = [];
    for await (const response of finder.find()) {
      savedObjects.push(...(response.saved_objects ?? []));
    }
    await finder.close();

    const savedQueries = savedObjects.map(injectReferences);
    return { total: savedQueries.length, savedQueries };
  };

  const deleteSavedQuery = async (id: string) => {
    return await soClient.delete('query', id);
  };

  return {
    create: createSavedQuery,
    update: updateSavedQuery,
    get: getSavedQuery,
    count: getSavedQueriesCount,
    find: findSavedQueries,
    getAll: getAllSavedQueries,
    delete: deleteSavedQuery,
  };
}

export type SavedQueryRouteHandlerContext = CustomRequestHandlerContext<{
  savedQuery: Promise<ReturnType<typeof registerSavedQueryRouteHandlerContext>>;
}>;
