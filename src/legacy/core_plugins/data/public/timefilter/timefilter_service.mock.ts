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

import { TimefilterService, TimeHistoryContract, TimefilterContract } from '.';

export type TimefilterServiceClientContract = PublicMethodsOf<TimefilterService>;

const createSetupContractMock = () => {
  const timefilterMock: jest.Mocked<TimefilterContract> = {
    isAutoRefreshSelectorEnabled: jest.fn(),
    isTimeRangeSelectorEnabled: jest.fn(),
    getEnabledUpdated$: jest.fn(),
    getTimeUpdate$: jest.fn(),
    getRefreshIntervalUpdate$: jest.fn(),
    getAutoRefreshFetch$: jest.fn(),
    getFetch$: jest.fn(),
    getTime: jest.fn(),
    setTime: jest.fn(),
    setRefreshInterval: jest.fn(),
    getRefreshInterval: jest.fn(),
    getActiveBounds: jest.fn(),
    disableAutoRefreshSelector: jest.fn(),
    disableTimeRangeSelector: jest.fn(),
    enableAutoRefreshSelector: jest.fn(),
    enableTimeRangeSelector: jest.fn(),
    getBounds: jest.fn(),
    calculateBounds: jest.fn(),
    createFilter: jest.fn(),
  };

  const historyMock: jest.Mocked<TimeHistoryContract> = {
    add: jest.fn(),
    get: jest.fn(),
  };

  const setupContract = {
    timefilter: timefilterMock,
    history: historyMock,
  };

  return setupContract;
};

const createMock = () => {
  const mocked: jest.Mocked<TimefilterServiceClientContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const timefilterServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
