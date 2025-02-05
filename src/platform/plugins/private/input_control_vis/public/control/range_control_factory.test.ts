/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rangeControlFactory } from './range_control_factory';
import { ControlParams, CONTROL_TYPES } from '../editor_utils';
import { getDepsMock, getSearchSourceMock } from '../test_utils';

describe('rangeControlFactory', () => {
  describe('fetch', () => {
    const controlParams: ControlParams = {
      id: '1',
      fieldName: 'myNumberField',
      options: {},
      type: CONTROL_TYPES.RANGE,
      label: 'test',
      indexPattern: {} as any,
      parent: {} as any,
    };
    const useTimeFilter = false;

    test('should set min and max from aggregation results', async () => {
      const esSearchResponse = {
        aggregations: {
          maxAgg: { value: 100 },
          minAgg: { value: 10 },
        },
      };
      const searchSourceMock = getSearchSourceMock(esSearchResponse);
      const deps = getDepsMock({
        searchSource: {
          create: searchSourceMock,
        },
      });

      const rangeControl = await rangeControlFactory(controlParams, useTimeFilter, deps);
      await rangeControl.fetch();

      expect(rangeControl.isEnabled()).toBe(true);
      expect(rangeControl.min).toBe(10);
      expect(rangeControl.max).toBe(100);
    });

    test('should disable control when there are 0 hits', async () => {
      // ES response when the query does not match any documents
      const esSearchResponse = {
        aggregations: {
          maxAgg: { value: null },
          minAgg: { value: null },
        },
      };
      const searchSourceMock = getSearchSourceMock(esSearchResponse);
      const deps = getDepsMock({
        searchSource: {
          create: searchSourceMock,
        },
      });

      const rangeControl = await rangeControlFactory(controlParams, useTimeFilter, deps);
      await rangeControl.fetch();

      expect(rangeControl.isEnabled()).toBe(false);
    });

    test('should disable control when response is empty', async () => {
      // ES response for dashboardonly user who does not have read permissions on index is 200 (which is weird)
      // and there is not aggregations key
      const esSearchResponse = {};
      const searchSourceMock = getSearchSourceMock(esSearchResponse);
      const deps = getDepsMock({
        searchSource: {
          create: searchSourceMock,
        },
      });

      const rangeControl = await rangeControlFactory(controlParams, useTimeFilter, deps);
      await rangeControl.fetch();

      expect(rangeControl.isEnabled()).toBe(false);
    });
  });
});
