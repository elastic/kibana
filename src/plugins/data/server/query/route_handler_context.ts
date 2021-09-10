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

function toSavedQuery({ id, attributes, references }: SavedObject<SavedQueryAttributes>) {
  const filters = inject(attributes.filters ?? [], references);
  return { id, attributes: { filters, ...attributes } };
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
      query,
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

    return toSavedQuery(savedObject);
  };

  const getSavedQuery = async (id: string) => {
    const savedObject = await context.core.savedObjects.client.get<SavedQueryAttributes>(
      'query',
      id
    );
    return toSavedQuery(savedObject);
  };

  const getSavedQueriesCount = async () => {
    const { total } = await context.core.savedObjects.client.find<SavedQueryAttributes>({
      type: 'query',
    });
    return total;
  };

  const findSavedQueries = async ({ page = 1, perPage = 50, search = '' }) => {
    const {
      total,
      saved_objects: savedObjects,
    } = await context.core.savedObjects.client.find<SavedQueryAttributes>({
      type: 'query',
      page,
      perPage,
      search,
    });

    const savedQueries = savedObjects.map(toSavedQuery);

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
