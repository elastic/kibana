/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import mockDispatchDataD3 from '../../fixtures/dispatch_bar_chart_d3.json';
import { Dispatch } from './dispatch';
import mockdataPoint from '../../fixtures/dispatch_bar_chart_data_point.json';
import mockConfigPercentage from '../../fixtures/dispatch_bar_chart_config_percentage.json';
import mockConfigNormal from '../../fixtures/dispatch_bar_chart_config_normal.json';

jest.mock('d3', () => ({
  event: {
    target: {
      nearestViewportElement: {
        __data__: mockDispatchDataD3,
      },
    },
  },
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
