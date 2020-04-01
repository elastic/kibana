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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from '../../../../../../src/core/public/mocks';
import {
  AggConfigs,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  getCalculateAutoTimeExpression,
} from './';
import { SearchAggsSetup, SearchAggsStart } from './types';
import { mockAggTypesRegistry } from './test_helpers';

const aggTypeBaseParamMock = () => ({
  name: 'some_param',
  type: 'some_param_type',
  displayName: 'some_agg_type_param',
  required: false,
  advanced: false,
  default: {},
  write: jest.fn(),
  serialize: jest.fn().mockImplementation(() => {}),
  deserialize: jest.fn().mockImplementation(() => {}),
  options: [],
});

const aggTypeConfigMock = () => ({
  name: 'some_name',
  title: 'some_title',
  params: [aggTypeBaseParamMock()],
});

export const aggTypesRegistrySetupMock = (): AggTypesRegistrySetup => ({
  registerBucket: jest.fn(),
  registerMetric: jest.fn(),
});

export const aggTypesRegistryStartMock = (): AggTypesRegistryStart => ({
  get: jest.fn().mockImplementation(aggTypeConfigMock),
  getBuckets: jest.fn().mockImplementation(() => [aggTypeConfigMock()]),
  getMetrics: jest.fn().mockImplementation(() => [aggTypeConfigMock()]),
  getAll: jest.fn().mockImplementation(() => ({
    buckets: [aggTypeConfigMock()],
    metrics: [aggTypeConfigMock()],
  })),
});

export const searchAggsSetupMock = (): SearchAggsSetup => ({
  calculateAutoTimeExpression: getCalculateAutoTimeExpression(coreMock.createSetup().uiSettings),
  types: aggTypesRegistrySetupMock(),
});

export const searchAggsStartMock = (): SearchAggsStart => ({
  calculateAutoTimeExpression: getCalculateAutoTimeExpression(coreMock.createStart().uiSettings),
  createAggConfigs: jest.fn().mockImplementation((indexPattern, configStates = [], schemas) => {
    return new AggConfigs(indexPattern, configStates, {
      typesRegistry: mockAggTypesRegistry(),
    });
  }),
  types: mockAggTypesRegistry(),
});
