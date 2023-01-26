/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Observable, of } from 'rxjs';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { DiscoverServices } from '../build_services';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { chromeServiceMock, coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';
import {
  CONTEXT_STEP_SETTING,
  DEFAULT_COLUMNS_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  SAMPLE_SIZE_SETTING,
  SAMPLE_ROWS_PER_PAGE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
  HIDE_ANNOUNCEMENTS,
} from '../../common';
import { UI_SETTINGS, calculateBounds } from '@kbn/data-plugin/public';
import { TopNavMenu } from '@kbn/navigation-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { LocalStorageMock } from './local_storage_mock';
import { createDiscoverDataViewsMock } from './data_views';

export function createDiscoverServicesMock(): DiscoverServices {
  const dataPlugin = dataPluginMock.createStartContract();
  const expressionsPlugin = expressionsPluginMock.createStartContract();

  dataPlugin.query.filterManager.getFilters = jest.fn(() => []);
  dataPlugin.query.filterManager.getUpdates$ = jest.fn(() => of({}) as unknown as Observable<void>);
  dataPlugin.query.timefilter.timefilter.createFilter = jest.fn();
  dataPlugin.query.timefilter.timefilter.getAbsoluteTime = jest.fn(() => ({
    from: '2021-08-31T22:00:00.000Z',
    to: '2022-09-01T09:16:29.553Z',
  }));
  dataPlugin.query.timefilter.timefilter.getTime = jest.fn(() => {
    return { from: 'now-15m', to: 'now' };
  });
  dataPlugin.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
    return { pause: true, value: 1000 };
  });

  dataPlugin.query.timefilter.timefilter.calculateBounds = jest.fn(calculateBounds);
  dataPlugin.query.getState = jest.fn(() => ({
    query: { query: '', language: 'lucene' },
    filters: [],
  }));
  dataPlugin.dataViews = createDiscoverDataViewsMock();

  return {
    core: coreMock.createStart(),
    charts: chartPluginMock.createSetupContract(),
    chrome: chromeServiceMock.createStartContract(),
    history: () => ({
      location: {
        search: '',
      },
      listen: jest.fn(),
    }),
    data: dataPlugin,
    docLinks: docLinksServiceMock.createStartContract(),
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
    fieldFormats: fieldFormatsMock,
    filterManager: dataPlugin.query.filterManager,
    inspector: {
      open: jest.fn(),
    },
    uiSettings: {
      get: jest.fn((key: string) => {
        if (key === 'fields:popularLimit') {
          return 5;
        } else if (key === DEFAULT_COLUMNS_SETTING) {
          return ['default_column'];
        } else if (key === UI_SETTINGS.META_FIELDS) {
          return [];
        } else if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
          return false;
        } else if (key === CONTEXT_STEP_SETTING) {
          return 5;
        } else if (key === SORT_DEFAULT_ORDER_SETTING) {
          return 'desc';
        } else if (key === FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE) {
          return false;
        } else if (key === SAMPLE_SIZE_SETTING) {
          return 250;
        } else if (key === SAMPLE_ROWS_PER_PAGE_SETTING) {
          return 150;
        } else if (key === MAX_DOC_FIELDS_DISPLAYED) {
          return 50;
        } else if (key === HIDE_ANNOUNCEMENTS) {
          return false;
        }
      }),
      isDefault: (key: string) => {
        return true;
      },
    },
    http: {
      basePath: '/',
    },
    dataViewEditor: {
      userPermissions: {
        editDataView: () => true,
      },
    },
    dataViewFieldEditor: {
      openEditor: jest.fn(),
      userPermissions: {
        editIndexPattern: jest.fn(),
      },
    },
    navigation: {
      ui: { TopNavMenu, AggregateQueryTopNavMenu: TopNavMenu },
    },
    metadata: {
      branch: 'test',
    },
    theme: {
      useChartsTheme: jest.fn(() => EUI_CHARTS_THEME_LIGHT.theme),
      useChartsBaseTheme: jest.fn(() => EUI_CHARTS_THEME_LIGHT.theme),
    },
    storage: new LocalStorageMock({}) as unknown as Storage,
    addBasePath: jest.fn(),
    toastNotifications: {
      addInfo: jest.fn(),
      addWarning: jest.fn(),
      addDanger: jest.fn(),
      addSuccess: jest.fn(),
    },
    expressions: expressionsPlugin,
    savedObjectsTagging: {},
    dataViews: dataPlugin.dataViews,
    timefilter: dataPlugin.query.timefilter.timefilter,
    lens: { EmbeddableComponent: jest.fn(() => null) },
    locator: {
      useUrl: jest.fn(() => ''),
      navigate: jest.fn(),
      getUrl: jest.fn(() => Promise.resolve('')),
    },
    contextLocator: { getRedirectUrl: jest.fn(() => '') },
    singleDocLocator: { getRedirectUrl: jest.fn(() => '') },
  } as unknown as DiscoverServices;
}

export const discoverServiceMock = createDiscoverServicesMock();
