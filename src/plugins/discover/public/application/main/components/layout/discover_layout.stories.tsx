/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataView, DataViewAttributes, SavedObject } from '@kbn/data-views-plugin/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SearchSource } from '@kbn/data-plugin/common';
import { TopNavMenu } from '@kbn/navigation-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { identity } from 'lodash';
import { DiscoverLayoutProps } from './types';
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_TABLE_LEGACY,
  ROW_HEIGHT_OPTION,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_MULTIFIELDS,
} from '../../../../../common';
import { SavedSearch } from '../../../..';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { DiscoverServices } from '../../../../build_services';
import { FetchStatus } from '../../../types';
import {
  AvailableFields$,
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
} from '../../utils/use_saved_search';
import { esHits } from '../../../../__mocks__/es_hits';
import { ElasticSearchHit } from '../../../../types';
import { Chart } from '../chart/point_series';
import { GetStateReturn } from '../../services/discover_state';
import { DiscoverLayout, SIDEBAR_CLOSED_KEY } from './discover_layout';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
setHeaderActionMenuMounter(() => void 0);

export const uiSettingsMock = {
  get: (key: string) => {
    if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    } else if (key === DEFAULT_COLUMNS_SETTING) {
      return ['default_column'];
    } else if (key === DOC_TABLE_LEGACY) {
      return false;
    } else if (key === SEARCH_FIELDS_FROM_SOURCE) {
      return false;
    } else if (key === SHOW_MULTIFIELDS) {
      return false;
    } else if (key === ROW_HEIGHT_OPTION) {
      return 3;
    } else if (key === 'dateFormat:tz') {
      return true;
    }
  },
  isDefault: () => {
    return true;
  },
} as unknown as IUiSettingsClient;

const fields = [
  {
    name: '_source',
    type: '_source',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
    aggregatable: false,
  },
  {
    name: 'message',
    type: 'string',
    displayName: 'message',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: 'extension',
    type: 'string',
    displayName: 'extension',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    displayName: 'bytesDisplayName',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    displayName: 'scripted',
    scripted: true,
    filterable: false,
  },
  {
    name: 'object.value',
    type: 'number',
    displayName: 'object.value',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
] as DataView['fields'];

const services = {
  core: { http: { basePath: { prepend: () => void 0 } } },
  storage: new LocalStorageMock({
    [SIDEBAR_CLOSED_KEY]: false,
  }) as unknown as Storage,
  data: {
    query: {
      timefilter: {
        timefilter: () => void 0,
      },
    },
  },
  uiSettings: uiSettingsMock,
  dataViewFieldEditor: {
    openEditor: () => void 0,
    userPermissions: {
      editIndexPattern: () => void 0,
    },
  },
  navigation: {
    ui: { TopNavMenu },
  },
  theme: {
    useChartsTheme: () => ({
      ...EUI_CHARTS_THEME_LIGHT.theme,
      chartPaddings: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      },
      heatmap: { xAxisLabel: { rotation: {} } },
    }),
    useChartsBaseTheme: () => EUI_CHARTS_THEME_LIGHT.theme,
  },
  capabilities: {
    visualize: {
      show: true,
    },
    discover: {
      save: false,
    },
    advancedSettings: {
      save: true,
    },
  },
  docLinks: { links: { discover: {} } },
  addBasePath: (path: string) => path,
  filterManager: {
    getGlobalFilters: () => [],
    getAppFilters: () => [],
  },
  history: () => ({}),
  fieldFormats: {
    deserialize: () => {
      const DefaultFieldFormat = FieldFormat.from(identity);
      return new DefaultFieldFormat();
    },
  },
} as unknown as DiscoverServices;

const indexPatternMock = {
  isTimeBased: () => true,
  getName: () => 'test',
  fields,
  getFormatterForField: () => ({
    convert: () => 'test',
  }),
  getFieldByName: (name: string) => {
    return fields[0];
  },
} as unknown as DataView;

indexPatternMock.fields.getByName = () => fields[0];
indexPatternMock.fields.getAll = () => fields;

services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
  return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
};

function getProps(indexPattern: DataView) {
  const searchSourceMock = {} as unknown as SearchSource;

  const indexPatternList = [indexPattern].map((ip) => {
    return { ...ip, ...{ attributes: { title: ip.title } } };
  }) as unknown as Array<SavedObject<DataViewAttributes>>;

  const main$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
  }) as DataMain$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHits as ElasticSearchHit[],
  }) as DataDocuments$;

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

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

  const charts$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    chartData,
    bucketInterval: {
      scaled: true,
      description: 'test',
      scale: 2,
    },
  }) as DataCharts$;

  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
    charts$,
    availableFields$,
  };
  const savedSearchMock = {} as unknown as SavedSearch;
  return {
    indexPattern,
    indexPatternList,
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: () => void 0,
    onChangeIndexPattern: () => void 0,
    onUpdateQuery: () => void 0,
    resetSavedSearch: () => void 0,
    savedSearch: savedSearchMock,
    savedSearchData$,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    state: { columns: [] },
    stateContainer: {
      setAppState: () => {},
      appStateContainer: {
        getState: () => ({
          interval: 'auto',
        }),
      },
    } as unknown as GetStateReturn,
    setExpandedDoc: () => void 0,
  } as unknown as DiscoverLayoutProps;
}

storiesOf('components/layout/DiscoverLayout', module).add('default', () => (
  <div style={{ width: '900px' }}>
    <IntlProvider locale="en">
      <KibanaContextProvider services={services}>
        <DiscoverLayout {...getProps(indexPatternMock)} />
      </KibanaContextProvider>
    </IntlProvider>
  </div>
));

storiesOf('components/layout/DiscoverLayout', module).add('mobile', () => (
  <div>
    <IntlProvider locale="en">
      <KibanaContextProvider services={services}>
        <DiscoverLayout {...getProps(indexPatternMock)} />
      </KibanaContextProvider>
    </IntlProvider>
  </div>
));
