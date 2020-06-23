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

import { savedObjectsRepositoryMock } from '../../../../../core/server/mocks';
import {
  CollectorOptions,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import { registerUiMetricUsageCollector } from './';

describe('telemetry_ui_metric', () => {
  let collector: CollectorOptions;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = config;
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const getUsageCollector = jest.fn();
  const registerType = jest.fn();
  const callCluster = jest.fn();

  beforeAll(() =>
    registerUiMetricUsageCollector(usageCollectionMock, registerType, getUsageCollector)
  );

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('if no savedObjectClient initialised, return undefined', async () => {
    expect(await collector.fetch(callCluster)).toBeUndefined();
  });

  test('when savedObjectClient is initialised, return something', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(
      async () =>
        ({
          saved_objects: [],
          total: 0,
        } as any)
    );
    getUsageCollector.mockImplementation(() => savedObjectClient);

    expect(await collector.fetch(callCluster)).toStrictEqual({});
    expect(savedObjectClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('results grouped by appName', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    savedObjectClient.find.mockImplementation(async () => {
      return {
        saved_objects: [
          { id: 'testAppName:testKeyName1', attributes: { count: 3 } },
          { id: 'testAppName:testKeyName2', attributes: { count: 5 } },
          { id: 'testAppName2:testKeyName3', attributes: { count: 1 } },
        ],
        total: 3,
      } as any;
    });

    getUsageCollector.mockImplementation(() => savedObjectClient);

    expect(await collector.fetch(callCluster)).toStrictEqual({
      testAppName: [
        { key: 'testKeyName1', value: 3 },
        { key: 'testKeyName2', value: 5 },
      ],
      testAppName2: [{ key: 'testKeyName3', value: 1 }],
    });
  });
});
