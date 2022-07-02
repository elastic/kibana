/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewAttributes, SavedObject } from '@kbn/data-views-plugin/common';
import { SearchSource } from '@kbn/data-plugin/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin';
import { action } from '@storybook/addon-actions';
import { FetchStatus } from '../../../../types';
import {
  AvailableFields$,
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../../hooks/use_saved_search';
import { buildDataTableRecordList } from '../../../../../utils/build_data_record';
import { esHits } from '../../../../../__mocks__/es_hits';
import { Chart } from '../../chart/point_series';
import { SavedSearch } from '../../../../..';
import { DiscoverLayoutProps } from '../types';
import { GetStateReturn } from '../../../services/discover_state';

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
      asMilliseconds: () => 1000,
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

const documentObservables = {
  main$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
  }) as DataMain$,

  documents$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: buildDataTableRecordList(esHits),
  }) as DataDocuments$,

  availableFields$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$,

  totalHits$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHits.length),
  }) as DataTotalHits$,

  charts$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    chartData,
    bucketInterval: {
      scaled: true,
      description: 'test',
      scale: 2,
    },
  }) as DataCharts$,
};

const plainRecordObservables = {
  main$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
    recordRawType: RecordRawType.PLAIN,
  }) as DataMain$,

  documents$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: buildDataTableRecordList(esHits),
    recordRawType: RecordRawType.PLAIN,
  }) as DataDocuments$,

  availableFields$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
    recordRawType: RecordRawType.PLAIN,
  }) as AvailableFields$,

  totalHits$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    recordRawType: RecordRawType.PLAIN,
  }) as DataTotalHits$,

  charts$: new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    recordRawType: RecordRawType.PLAIN,
  }) as DataCharts$,
};

const getCommonProps = (dataView: DataView) => {
  const searchSourceMock = {} as unknown as SearchSource;

  const dataViewList = [dataView].map((ip) => {
    return { ...ip, ...{ attributes: { title: ip.title } } };
  }) as unknown as Array<SavedObject<DataViewAttributes>>;

  const savedSearchMock = {} as unknown as SavedSearch;
  return {
    indexPattern: dataView,
    indexPatternList: dataViewList,
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: action('navigate to somewhere nice'),
    onChangeIndexPattern: action('change the data view'),
    onUpdateQuery: action('update the query'),
    resetSavedSearch: action('reset the saved search the query'),
    savedSearch: savedSearchMock,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,

    stateContainer: {
      setAppState: action('Set app state'),
      appStateContainer: {
        getState: () => ({
          interval: 'auto',
        }),
        setState: action('Set app state'),
      },
    } as unknown as GetStateReturn,
    setExpandedDoc: action('opening an expanded doc'),
  };
};

export function getDocumentsLayoutProps(dataView: DataView) {
  return {
    ...getCommonProps(dataView),
    savedSearchData$: documentObservables,
    state: {
      columns: ['name', 'message', 'bytes'],
      sort: [['date', 'desc']],
      query: {
        language: 'kuery',
        query: '',
      },
    },
  } as unknown as DiscoverLayoutProps;
}

export const getPlainRecordLayoutProps = (dataView: DataView) => {
  return {
    ...getCommonProps(dataView),
    savedSearchData$: plainRecordObservables,
    state: {
      columns: ['name', 'message', 'bytes'],
      sort: [['date', 'desc']],
      query: {
        sql: 'SELECT * FROM "kibana_sample_data_ecommerce"',
      },
    },
  } as unknown as DiscoverLayoutProps;
};
