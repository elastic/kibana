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
import mockDispatchDataD3 from './fixtures/dispatch_bar_chart_d3.json';
jest.mock('d3', () => ({
  event: {
    target: {
      nearestViewportElement: {
        __data__: mockDispatchDataD3,
      },
    },
  },
}));

import { Dispatch } from '../../lib/dispatch';
import mockdataPoint from './fixtures/dispatch_bar_chart_data_point.json';
import mockConfigPercentage from './fixtures/dispatch_bar_chart_config_percentage.json';
import mockConfigNormal from './fixtures/dispatch_bar_chart_config_normal.json';

jest.mock('ui/chrome', () => ({
  getUiSettingsClient: () => ({
    get: () => '',
  }),
  addBasePath: () => {},
}));

function getHandlerMock(config = {}, data = {}) {
  return {
    visConfig: { get: (id, fallback) => config[id] || fallback },
    data,
  };
}

describe('Vislib event responses dispatcher', () => {
  test('return data for a vertical bars popover in percentage mode', () => {
    const dataPoint = mockdataPoint;
    const handlerMock = getHandlerMock(mockConfigPercentage);
    const dispatch = new Dispatch(handlerMock);
    const actual = dispatch.eventResponse(dataPoint, 0);
    expect(actual.isPercentageMode).toBeTruthy();
  });

  test('return data for a vertical bars popover in normal mode', () => {
    const dataPoint = mockdataPoint;
    const handlerMock = getHandlerMock(mockConfigNormal);
    const dispatch = new Dispatch(handlerMock);
    const actual = dispatch.eventResponse(dataPoint, 0);
    expect(actual.isPercentageMode).toBeFalsy();
  });
});
