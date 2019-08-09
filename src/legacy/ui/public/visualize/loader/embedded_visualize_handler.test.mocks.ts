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

jest.useFakeTimers();

import { EventEmitter } from 'events';

jest.mock('ui/notify', () => ({
  toastNotifications: jest.fn(),
}));

jest.mock('./utils', () => ({
  queryGeohashBounds: jest.fn(),
}));

jest.mock('./pipeline_helpers/utilities', () => ({
  getFormat: jest.fn(),
  getTableAggs: jest.fn(),
}));

export const timefilter = new EventEmitter();
jest.doMock('../../timefilter', () => ({ timefilter }));

jest.mock('../../inspector', () => ({
  Inspector: {
    open: jest.fn(),
    isAvailable: jest.fn(),
  },
}));

export const mockDataLoaderFetch = jest.fn().mockReturnValue({
  as: 'visualization',
  value: {
    visType: 'histogram',
    visData: {},
    visConfig: {},
    params: {},
  },
});
const MockDataLoader = class {
  public async fetch(data: any) {
    return await mockDataLoaderFetch(data);
  }
};

jest.mock('./pipeline_data_loader', () => ({
  PipelineDataLoader: MockDataLoader,
}));
jest.mock('./visualize_data_loader', () => ({
  VisualizeDataLoader: MockDataLoader,
}));
