/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract, SavedObjectAttributes } from 'src/core/public';
import { SavedQueryAttributes, SavedQuery, SavedQueryService } from './types';

type SerializedSavedQueryAttributes = SavedObjectAttributes &
  SavedQueryAttributes & {
    query: {
      query: string;
      language: string;
    };
  };

export const createSavedQueryService = (
  savedObjectsClient: SavedObjectsClientContract
): SavedQueryService => {
  const saveQuery = async (attributes: SavedQueryAttributes, { overwrite = false } = {}) => {
    if (!attributes.title.length) {
      // title is required extra check against circumventing the front end
      throw new Error('Cannot create saved query without a title');
    }

    const query = {
      query:
        typeof attributes.query.query === 'string'
          ? attributes.query.query
          : JSON.stringify(attributes.query.query),
      language: attributes.query.language,
    };

    const queryObject: SerializedSavedQueryAttributes = {
      title: attributes.title.trim(), // trim whitespace before save as an extra precaution against circumventing the front end
      description: attributes.description,
      query,
    };

    if (attributes.filters) {
      queryObject.filters = attributes.filters;
    }

    if (attributes.timefilter) {
      queryObject.timefilter = attributes.timefilter;
    }

    let rawQueryResponse;
    if (!overwrite) {
      rawQueryResponse = await savedObjectsClient.create('query', queryObject, {
        id: attributes.title,
      });
    } else {
      rawQueryResponse = await savedObjectsClient.create('query', queryObject, {
        id: attributes.title,
        overwrite: true,
      });
    }

    if (rawQueryResponse.error) {
      throw new Error(rawQueryResponse.error.message);
    }

    return parseSavedQueryObject(rawQueryResponse);
  };
  // we have to tell the saved objects client how many to fetch, otherwise it defaults to fetching 20 per page
  const getAllSavedQueries = async (): Promise<SavedQuery[]> => {
    const count = await getSavedQueryCount();
    const response = await savedObjectsClient.find<SerializedSavedQueryAttributes>({
      type: 'query',
      perPage: count,
      page: 1,
    });
    return response.savedObjects.map(
      (savedObject: { id: string; attributes: SerializedSavedQueryAttributes }) =>
        parseSavedQueryObject(savedObject)
    );
  };
  // findSavedQueries will do a 'match_all' if no search string is passed in
  const findSavedQueries = async (
    searchText: string = '',
    perPage: number = 50,
    activePage: number = 1
  ): Promise<{ total: number; queries: SavedQuery[] }> => {
    const response = await savedObjectsClient.find<SerializedSavedQueryAttributes>({
      type: 'query',
      search: searchText,
      searchFields: ['title^5', 'description'],
      sortField: '_score',
      perPage,
      page: activePage,
    });

    return {
      total: response.total,
      queries: response.savedObjects.map(
        (savedObject: { id: string; attributes: SerializedSavedQueryAttributes }) =>
          parseSavedQueryObject(savedObject)
      ),
    };
  };

  const getSavedQuery = async (id: string): Promise<SavedQuery> => {
    const savedObject = await savedObjectsClient.get<SerializedSavedQueryAttributes>('query', id);
    if (savedObject.error) {
      throw new Error(savedObject.error.message);
    }
    return parseSavedQueryObject(savedObject);
  };

  const deleteSavedQuery = async (id: string) => {
    return await savedObjectsClient.delete('query', id);
  };

  const parseSavedQueryObject = (savedQuery: {
    id: string;
    attributes: SerializedSavedQueryAttributes;
  }) => {
    let queryString;
    try {
      queryString = JSON.parse(savedQuery.attributes.query.query);
    } catch (error) {
      queryString = savedQuery.attributes.query.query;
    }
    const savedQueryItems: SavedQueryAttributes = {
      title: savedQuery.attributes.title || '',
      description: savedQuery.attributes.description || '',
      query: {
        query: queryString,
        language: savedQuery.attributes.query.language,
      },
    };
    if (savedQuery.attributes.filters) {
      savedQueryItems.filters = savedQuery.attributes.filters;
    }
    if (savedQuery.attributes.timefilter) {
      savedQueryItems.timefilter = savedQuery.attributes.timefilter;
    }
    return {
      id: savedQuery.id,
      attributes: savedQueryItems,
    };
  };

  const getSavedQueryCount = async (): Promise<number> => {
    const response = await savedObjectsClient.find<SerializedSavedQueryAttributes>({
      type: 'query',
      perPage: 0,
      page: 1,
    });
    return response.total;
  };

  return {
    saveQuery,
    getAllSavedQueries,
    findSavedQueries,
    getSavedQuery,
    deleteSavedQuery,
    getSavedQueryCount,
  };
};
