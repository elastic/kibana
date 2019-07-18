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

import chrome from 'ui/chrome';
import { SavedObjectAttributes } from 'src/core/server';
import { SavedQueryAttributes, SavedQuery } from '../index';

interface SerializedSavedQueryAttributes extends SavedObjectAttributes {
  title: string;
  description: string;
  query: {
    query: string;
    language: string;
  };
  filters?: string;
  timefilter?: string;
}

export const saveQuery = async (attributes: SavedQueryAttributes, id?: string) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();

  const query = {
    query:
      typeof attributes.query.query === 'string'
        ? attributes.query.query
        : JSON.stringify(attributes.query.query),
    language: attributes.query.language,
  };

  const queryObject: {
    title: string;
    description: string;
    query: {
      query: string;
      language: string;
    };
    filters?: string;
    timefilter?: string;
  } = {
    title: attributes.title,
    description: attributes.description,
    query,
  };

  if (attributes.filters) {
    queryObject.filters = JSON.stringify(attributes.filters);
  }

  if (attributes.timefilter) {
    queryObject.timefilter = JSON.stringify(attributes.timefilter);
  }

  let rawQueryResponse;
  if (id === undefined) {
    rawQueryResponse = await savedObjectsClient.create('query', queryObject);
  } else {
    rawQueryResponse = await savedObjectsClient.create('query', queryObject, {
      id,
      overwrite: true,
    });
  }

  if (rawQueryResponse.error) {
    throw new Error(rawQueryResponse.error.message);
  }

  return parseSavedQueryObject(rawQueryResponse);
};

export const getAllSavedQueries = async (): Promise<SavedQuery[]> => {
  const savedObjectsClient = chrome.getSavedObjectsClient();

  const response = await savedObjectsClient.find<SerializedSavedQueryAttributes>({
    type: 'query',
  });

  return response.savedObjects.map(
    (savedObject: { id: string; attributes: SerializedSavedQueryAttributes }) =>
      parseSavedQueryObject(savedObject)
  );
};

export const findSavedQueries = async (searchText: string = ''): Promise<SavedQuery[]> => {
  const savedObjectsClient = chrome.getSavedObjectsClient();

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

export const getSavedQuery = async (id: string): Promise<SavedQuery> => {
  const savedObjectsClient = chrome.getSavedObjectsClient();

  const response = await savedObjectsClient.get<SerializedSavedQueryAttributes>('query', id);
  return parseSavedQueryObject(response);
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
    savedQueryItems.filters = JSON.parse(savedQuery.attributes.filters);
  }
  if (savedQuery.attributes.timefilter) {
    savedQueryItems.timefilter = JSON.parse(savedQuery.attributes.timefilter);
  }
  return {
    id: savedQuery.id,
    attributes: savedQueryItems,
  };
};
