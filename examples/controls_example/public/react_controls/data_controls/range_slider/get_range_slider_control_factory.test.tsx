/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';
import { BehaviorSubject, of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { ControlGroupApi } from '../../control_group/types';
import { getRangesliderControlFactory } from './get_range_slider_control_factory';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { ControlApiRegistration } from '../../types';
import { RangesliderControlApi, RangesliderControlState } from './types';
import { StateComparators } from '@kbn/presentation-publishing';

describe('RangesliderControlApi', () => {
  const uuid = 'myControl1';
  const dashboardApi = {
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  };
  const controlGroupApi = {
    parentApi: dashboardApi,
  } as unknown as ControlGroupApi;
  const dataStartServiceMock = dataPluginMock.createStartContract();
  let totalResults = 20;
  dataStartServiceMock.search.searchSource.create = jest.fn().mockImplementation(() => {
    let isAggsRequest = false;
    return {
      setField: (key: string) => {
        if (key === 'aggs') {
          isAggsRequest = true;
        }
      },
      fetch$: () => {
        return isAggsRequest
          ? of({
              rawResponse: { aggregations: { minAgg: { value: 0 }, maxAgg: { value: 1000 } } },
            })
          : of({
              rawResponse: { hits: { total: { value: totalResults } } },
            });
      },
    };
  });
  const dataViewsServiceMock = dataViewPluginMocks.createStartContract();
  const factory = getRangesliderControlFactory({
    core: coreMock.createStart(),
    data: dataStartServiceMock,
    dataViews: dataViewsServiceMock,
  });

  function buildApiMock(
    api: ControlApiRegistration<RangesliderControlApi>,
    nextComparitors: StateComparators<RangesliderControlState>
  ) {
    return {
      ...api,
      uuid,
      parentApi: controlGroupApi,
      unsavedChanges: new BehaviorSubject<Partial<RangesliderControlState> | undefined>(undefined),
      resetUnsavedChanges: () => {},
      type: factory.type,
    };
  }
  
  test('should not set filters when value is not provided', () => {
    const { api } = factory.buildControl({
      dataViewId: 'myDataView',
      fieldName: 'myField',
    }, buildApiMock, uuid, controlGroupApi);
    expect(api.filters$.value).toEqual(undefined);
  });
});