/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { Subject, BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DataView } from '../../../../../../data_views/public';
import { setHeaderActionMenuMounter, setUiActions } from '../../../../kibana_services';
import { esHits } from '../../../../__mocks__/es_hits';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../../../data/common/search/search_source/mocks';
import { GetStateReturn } from '../../services/discover_state';
import { DataCharts$, DataTotalHits$ } from '../../utils/use_saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { Chart } from './point_series';
import { DiscoverChart } from './discover_chart';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { ReactWrapper } from 'enzyme';

setHeaderActionMenuMounter(jest.fn());

async function mountComponent(isTimeBased: boolean = false) {
  const searchSourceMock = createSearchSourceMock({});
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHits.length),
  }) as DataTotalHits$;

  const chartData = {
    xAxisOrderedValues: [
      1623880800000, 1623967200000, 1624053600000, 1624140000000, 1624226400000, 1624312800000,
      1624399200000, 1624485600000, 1624572000000, 1624658400000, 1624744800000, 1624831200000,
      1624917600000, 1625004000000, 1625090400000,
    ],
    xAxisFormat: { id: 'date', params: { pattern: 'YYYY-MM-DD' } },
    xAxisLabel: 'order_date per day',
    yAxisFormat: { id: 'number' },
    ordered: {
      date: true,
      interval: {
        asMilliseconds: jest.fn(),
      },
      intervalESUnit: 'd',
      intervalESValue: 1,
      min: '2021-03-18T08:28:56.411Z',
      max: '2021-07-01T07:28:56.411Z',
    },
    yAxisLabel: 'Count',
    values: [
      { x: 1623880800000, y: 134 },
      { x: 1623967200000, y: 152 },
      { x: 1624053600000, y: 141 },
      { x: 1624140000000, y: 138 },
      { x: 1624226400000, y: 142 },
      { x: 1624312800000, y: 157 },
      { x: 1624399200000, y: 149 },
      { x: 1624485600000, y: 146 },
      { x: 1624572000000, y: 170 },
      { x: 1624658400000, y: 137 },
      { x: 1624744800000, y: 150 },
      { x: 1624831200000, y: 144 },
      { x: 1624917600000, y: 147 },
      { x: 1625004000000, y: 137 },
      { x: 1625090400000, y: 66 },
    ],
  } as unknown as Chart;

  const charts$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    chartData,
    bucketInterval: {
      scaled: true,
      description: 'test',
      scale: 2,
    },
  }) as DataCharts$;

  const props = {
    indexPattern: {
      isTimeBased: () => isTimeBased,
      id: '123',
      getFieldByName: () => ({ type: 'date', name: 'timefield', visualizable: true }),
      timeFieldName: 'timefield',
    } as unknown as DataView,
    resetSavedSearch: jest.fn(),
    savedSearch: savedSearchMock,
    savedSearchDataChart$: charts$,
    savedSearchDataTotalHits$: totalHits$,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    state: { columns: [] },
    stateContainer: {} as GetStateReturn,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    setDiscoverViewMode: jest.fn(),
  };

  let instance: ReactWrapper = {} as ReactWrapper;
  await act(async () => {
    instance = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DiscoverChart {...props} />
      </KibanaContextProvider>
    );
    // wait for initial async loading to complete
    await new Promise((r) => setTimeout(r, 0));
    await instance.update();
  });
  return instance;
}

describe('Discover chart', () => {
  let triggerActions: unknown[] = [];
  beforeEach(() => {
    setUiActions({
      getTriggerCompatibleActions: () => {
        return triggerActions;
      },
    } as unknown as UiActionsStart);
  });
  test('render without timefield', async () => {
    const component = await mountComponent();
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeFalsy();
  });

  test('render with timefield without visualize permissions', async () => {
    const component = await mountComponent(true);
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeTruthy();
    expect(component.find('[data-test-subj="discoverEditVisualization"]').exists()).toBeFalsy();
  });

  test('render with timefield with visualize permissions', async () => {
    triggerActions = [{}];
    const component = await mountComponent(true);
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeTruthy();
    expect(component.find('[data-test-subj="discoverEditVisualization"]').exists()).toBeTruthy();
  });

  test('triggers ui action on click', async () => {
    const fn = jest.fn();
    setUiActions({
      getTrigger: () => ({
        exec: fn,
      }),
      getTriggerCompatibleActions: () => {
        return [{}];
      },
    } as unknown as UiActionsStart);
    const component = await mountComponent(true);
    component.find('[data-test-subj="discoverEditVisualization"]').first().simulate('click');
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({
        indexPatternId: '123',
        fieldName: 'timefield',
      })
    );
  });
});
