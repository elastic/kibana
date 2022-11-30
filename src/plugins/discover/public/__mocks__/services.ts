/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
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
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { TopNavMenu } from '@kbn/navigation-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { LocalStorageMock } from './local_storage_mock';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { dataViewsMock } from './data_views';
import { Observable, of } from 'rxjs';
const dataPlugin = dataPluginMock.createStartContract();
const expressionsPlugin = expressionsPluginMock.createStartContract();

dataPlugin.query.filterManager.getFilters = jest.fn(() => []);
dataPlugin.query.filterManager.getUpdates$ = jest.fn(() => of({}) as unknown as Observable<void>);

export const discoverServiceMock = {
  core: coreMock.createStart(),
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
  dataViews: dataViewsMock,
  timefilter: { createFilter: jest.fn() },
  locator: {
    useUrl: jest.fn(() => ''),
    navigate: jest.fn(),
    getUrl: jest.fn(() => Promise.resolve('')),
  },
  contextLocator: { getRedirectUrl: jest.fn(() => '') },
  singleDocLocator: { getRedirectUrl: jest.fn(() => '') },
} as unknown as DiscoverServices;
