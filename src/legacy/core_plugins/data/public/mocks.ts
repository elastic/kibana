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

import { filterServiceMock } from './filter/filter_service.mock';
import { indexPatternsServiceMock } from './index_patterns/index_patterns_service.mock';
import { queryServiceMock } from './query/query_service.mock';
import { timefilterServiceMock } from './timefilter/timefilter_service.mock';

function createDataSetupMock() {
  return {
    filter: filterServiceMock.createSetupContract(),
    indexPatterns: indexPatternsServiceMock.createSetupContract(),
    query: queryServiceMock.createSetupContract(),
    timefilter: timefilterServiceMock.createSetupContract(),
  };
}

function createDataStartMock() {
  return {};
}

export const dataPluginMock = {
  createSetup: createDataSetupMock,
  createStart: createDataStartMock,
};
