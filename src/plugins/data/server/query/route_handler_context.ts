/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestHandlerContext, SavedObject } from 'kibana/server';
import { SavedQueryAttributes } from '../../common';
import { extract, inject } from '../../common/query/persistable_state';

function toSavedObject({ id, attributes, references }: SavedObject<SavedQueryAttributes>) {
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

export function registerSavedQueryRouteHandlerContext(context: RequestHandlerContext) {
  const createSavedQuery = async ({
    title,
    description,
    query,
    filters = [],
    timefilter,
  }: SavedQueryAttributes) => {
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

    const savedObject = await context.core.savedObjects.client.create<SavedQueryAttributes>(
      'query',
      attributes,
      {
        references,
      }
    );

    // TODO: Handle properly
    if (savedObject.error) throw new Error(savedObject.error.message);

    return toSavedObject(savedObject);
  };

  const getSavedQuery = async (id: string) => {
    const { saved_object: savedObject, outcome } =
      await context.core.savedObjects.client.resolve<SavedQueryAttributes>('query', id);
    if (outcome === 'conflict') {
      throw new Error(`Multiple saved queries found with ID: ${id} (legacy URL alias conflict)`);
    } else if (savedObject.error) {
      throw new Error(savedObject.error.message);
    }
    return toSavedObject(savedObject);
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

    const savedQueries = savedObjects.map(toSavedObject);

    return { total, savedQueries };
  };

  const deleteSavedQuery = (id: string) => {
    return context.core.savedObjects.client.delete('query', id);
  };

  return {
    create: createSavedQuery,
    get: getSavedQuery,
    count: getSavedQueriesCount,
    find: findSavedQueries,
    delete: deleteSavedQuery,
  };
}

export interface SavedQueryRouteHandlerContext extends RequestHandlerContext {
  savedQuery: ReturnType<typeof registerSavedQueryRouteHandlerContext>;
}
