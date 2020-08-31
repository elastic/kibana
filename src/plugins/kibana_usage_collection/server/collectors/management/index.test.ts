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

import { uiSettingsServiceMock } from '../../../../../core/server/mocks';
import {
  CollectorOptions,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';

import { registerManagementUsageCollector } from './';

describe('telemetry_application_usage_collector', () => {
  let collector: CollectorOptions;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = config;
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const uiSettingsClient = uiSettingsServiceMock.createClient();
  const getUiSettingsClient = jest.fn(() => uiSettingsClient);
  const callCluster = jest.fn();

  beforeAll(() => {
    registerManagementUsageCollector(usageCollectionMock, getUiSettingsClient);
  });

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
  });

  test('isReady() => false if no client', () => {
    getUiSettingsClient.mockImplementationOnce(() => undefined as any);
    expect(collector.isReady()).toBe(false);
  });

  test('isReady() => true', () => {
    expect(collector.isReady()).toBe(true);
  });

  test('fetch()', async () => {
    uiSettingsClient.getUserProvided.mockImplementationOnce(async () => ({
      'my-key': { userValue: 'my-value' },
    }));
    await expect(collector.fetch(callCluster)).resolves.toMatchSnapshot();
  });

  test('fetch() should not fail if invoked when not ready', async () => {
    getUiSettingsClient.mockImplementationOnce(() => undefined as any);
    await expect(collector.fetch(callCluster)).resolves.toBe(undefined);
  });
});
