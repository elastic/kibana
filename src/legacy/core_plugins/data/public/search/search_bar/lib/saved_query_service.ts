/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectAttributes } from 'src/core/server';
import { SavedObjectsClientContract } from 'src/core/public';
import { SavedQueryAttributes, SavedQuery } from '../index';

type SerializedSavedQueryAttributes = SavedObjectAttributes &
  SavedQueryAttributes & {
    query: {
      query: string;
      language: string;
    };
  };

export interface SavedQueryService {
  saveQuery: (
    attributes: SavedQueryAttributes,
    config?: { overwrite: boolean }
  ) => Promise<SavedQuery>;
  getAllSavedQueries: () => Promise<SavedQuery[]>;
  findSavedQueries: (searchText?: string) => Promise<SavedQuery[]>;
  getSavedQuery: (id: string) => Promise<SavedQuery>;
  deleteSavedQuery: (id: string) => Promise<{}>;
}

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

  const getAllSavedQueries = async (): Promise<SavedQuery[]> => {
    const response = await savedObjectsClient.find<SerializedSavedQueryAttributes>({
      type: 'query',
    });

    return response.savedObjects.map(
      (savedObject: { id: string; attributes: SerializedSavedQueryAttributes }) =>
        parseSavedQueryObject(savedObject)
    );
  };

  const findSavedQueries = async (searchText: string = ''): Promise<SavedQuery[]> => {
    const response = await savedObjectsClient.find<SerializedSavedQueryAttributes>({
      type: 'query',
      search: searchText,
      searchFields: ['title^5', 'description'],
      sortField: '_score',
    });

    return response.savedObjects.map(
      (savedObject: { id: string; attributes: SerializedSavedQueryAttributes }) =>
        parseSavedQueryObject(savedObject)
    );
  };

  const getSavedQuery = async (id: string): Promise<SavedQuery> => {
    const response = await savedObjectsClient.get<SerializedSavedQueryAttributes>('query', id);
    return parseSavedQueryObject(response);
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

  return {
    saveQuery,
    getAllSavedQueries,
    findSavedQueries,
    getSavedQuery,
    deleteSavedQuery,
  };
};
