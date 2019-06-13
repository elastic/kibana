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
import { SavedQuery } from '../../../search';
import { Query } from '../../query_service';

export const saveQuery = async (savedQuery: SavedQuery) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();

  const query = {
    query:
      typeof savedQuery.query.query === 'string'
        ? savedQuery.query.query
        : JSON.stringify(savedQuery.query.query),
    language: savedQuery.query.language,
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
    title: savedQuery.title,
    description: savedQuery.description,
    query,
  };

  if (savedQuery.filters) {
    queryObject.filters = JSON.stringify(savedQuery.filters);
  }

  if (savedQuery.timefilter) {
    queryObject.timefilter = JSON.stringify(savedQuery.timefilter);
  }

  const rawQueryResponse = await savedObjectsClient.create('query', queryObject);
  if (rawQueryResponse.error) {
    throw new Error(rawQueryResponse.error.message);
  }
  const responseObject: SavedQuery = {
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
  return responseObject;
};
