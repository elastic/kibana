/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestHandlerContext, SavedObject } from '@kbn/core/server';
import { isFilters } from '@kbn/es-query';
import { isQuery, SavedQueryAttributes } from '../../common';
import { extract, inject } from '../../common/query/persistable_state';

function injectReferences({
  id,
  attributes,
  references,
}: Pick<SavedObject<SavedQueryAttributes>, 'id' | 'attributes' | 'references'>) {
  const { query } = attributes;
  if (typeof query.query === 'string') {
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

  const attributes: SavedQueryAttributes = {
    title: title.trim(),
    description: description.trim(),
    query: {
      ...query,
      query: typeof query.query === 'string' ? query.query : JSON.stringify(query.query),
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

export function registerSavedQueryRouteHandlerContext(context: RequestHandlerContext) {
  const createSavedQuery = async (attrs: SavedQueryAttributes) => {
    verifySavedQuery(attrs);
    const { attributes, references } = extractReferences(attrs);

    const savedObject = await context.core.savedObjects.client.create<SavedQueryAttributes>(
      'query',
      attributes,
      {
        references,
      }
    );

    // TODO: Handle properly
    if (savedObject.error) throw new Error(savedObject.error.message);

    return injectReferences(savedObject);
  };

  const updateSavedQuery = async (id: string, attrs: SavedQueryAttributes) => {
    verifySavedQuery(attrs);
    const { attributes, references } = extractReferences(attrs);

    const savedObject = await context.core.savedObjects.client.update<SavedQueryAttributes>(
      'query',
      id,
      attributes,
      {
        references,
      }
    );

    // TODO: Handle properly
    if (savedObject.error) throw new Error(savedObject.error.message);

    return injectReferences({ id, attributes, references });
  };

  const getSavedQuery = async (id: string) => {
    const { saved_object: savedObject, outcome } =
      await context.core.savedObjects.client.resolve<SavedQueryAttributes>('query', id);
    if (outcome === 'conflict') {
      throw new Error(`Multiple saved queries found with ID: ${id} (legacy URL alias conflict)`);
    } else if (savedObject.error) {
      throw new Error(savedObject.error.message);
    }
    return injectReferences(savedObject);
  };

  const getSavedQueriesCount = async () => {
    const { total } = await context.core.savedObjects.client.find<SavedQueryAttributes>({
      type: 'query',
    });
    return total;
  };

  const findSavedQueries = async ({ page = 1, perPage = 50, search = '' } = {}) => {
    const { total, saved_objects: savedObjects } =
      await context.core.savedObjects.client.find<SavedQueryAttributes>({
        type: 'query',
        page,
        perPage,
        search,
      });

    const savedQueries = savedObjects.map(injectReferences);

    return { total, savedQueries };
  };

  const getAllSavedQueries = async () => {
    const finder = context.core.savedObjects.client.createPointInTimeFinder<SavedQueryAttributes>({
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

  const deleteSavedQuery = (id: string) => {
    return context.core.savedObjects.client.delete('query', id);
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

export interface SavedQueryRouteHandlerContext extends RequestHandlerContext {
  savedQuery: ReturnType<typeof registerSavedQueryRouteHandlerContext>;
}
