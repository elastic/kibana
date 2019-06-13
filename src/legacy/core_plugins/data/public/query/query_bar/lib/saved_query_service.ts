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
import { SavedQueryAttributes } from '../../../search/search_bar';

export const saveQuery = async (attributes: SavedQueryAttributes, id: string = '') => {
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

  const responseObject: SavedQueryAttributes = {
    title: rawQueryResponse.attributes.title,
    description: rawQueryResponse.attributes.description,
    query: rawQueryResponse.attributes.query,
  };
  if (rawQueryResponse.attributes.filters) {
    responseObject.filters = JSON.parse(rawQueryResponse.attributes.filters);
  }
  if (rawQueryResponse.attributes.timefilter) {
    responseObject.timefilter = JSON.parse(rawQueryResponse.attributes.timefilter);
  }
  return { id: rawQueryResponse.id, attributes: responseObject };
};
