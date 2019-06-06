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

function mockClass<T>(
  module: string,
  Class: new (...args: any[]) => T,
  setup: (instance: any, args: any[]) => void
) {
  const MockClass = jest.fn(function(this: any, ...args: any[]) {
    setup(this, args);
  });

  // define the mock name which is used in some snapshots
  MockClass.mockName(`Mock${Class.name}`);

  // define the class name for the MockClass which is used in other snapshots
  Object.defineProperty(MockClass, 'name', {
    value: `Mock${Class.name}`,
  });

  jest.doMock(module, () => ({
    [Class.name]: MockClass,
  }));

  return MockClass;
}

// Mock the UiSettingsApi class
import { UiSettingsApi } from './ui_settings_api';
export const MockUiSettingsApi = mockClass('./ui_settings_api', UiSettingsApi, inst => {
  inst.stop = jest.fn();
  inst.getLoadingCount$ = jest.fn().mockReturnValue({
    loadingCountObservable: true,
  });
});

// Mock the UiSettingsClient class
import { UiSettingsClient } from './ui_settings_client';
export const MockUiSettingsClient = mockClass('./ui_settings_client', UiSettingsClient, inst => {
  inst.stop = jest.fn();
});
