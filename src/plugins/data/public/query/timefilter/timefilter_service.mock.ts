/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { TimefilterService, TimeHistoryContract, TimefilterContract } from '.';
import { Observable } from 'rxjs';
import { TimeRange } from '../../../common';

export type TimefilterServiceClientContract = PublicMethodsOf<TimefilterService>;

const createSetupContractMock = () => {
  const timefilterMock: jest.Mocked<TimefilterContract> = {
    isAutoRefreshSelectorEnabled: jest.fn(),
    isTimeRangeSelectorEnabled: jest.fn(),
    isTimeTouched: jest.fn(),
    getEnabledUpdated$: jest.fn(),
    getTimeUpdate$: jest.fn(),
    getRefreshIntervalUpdate$: jest.fn(),
    getAutoRefreshFetch$: jest.fn(() => new Observable<() => void>()),
    getFetch$: jest.fn().mockImplementation(() => new Observable<() => void>()),
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
    createRelativeFilter: jest.fn(),
    getRefreshIntervalDefaults: jest.fn(),
    getTimeDefaults: jest.fn(),
    getAbsoluteTime: jest.fn(),
  };

  const historyMock: jest.Mocked<TimeHistoryContract> = {
    add: jest.fn(),
    get: jest.fn(),
    get$: jest.fn(() => new Observable<TimeRange[]>()),
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
