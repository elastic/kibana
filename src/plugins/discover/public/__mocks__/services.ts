/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { DiscoverServices } from '../build_services';
import { dataPluginMock } from '../../../data/public/mocks';
import { chromeServiceMock, coreMock, docLinksServiceMock } from '../../../../core/public/mocks';
import {
  CONTEXT_STEP_SETTING,
  DEFAULT_COLUMNS_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  SAMPLE_SIZE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../common';
import { UI_SETTINGS } from '../../../data/public';
import { TopNavMenu } from '../../../navigation/public';
import { FORMATS_UI_SETTINGS } from 'src/plugins/field_formats/common';
import { LocalStorageMock } from './local_storage_mock';
const dataPlugin = dataPluginMock.createStartContract();

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
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
  },
  filterManager: dataPlugin.query.filterManager,
  uiSettings: {
    get: jest.fn((key: string) => {
      if (key === 'fields:popularLimit') {
        return 5;
      } else if (key === DEFAULT_COLUMNS_SETTING) {
        return [];
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
      } else if (key === MAX_DOC_FIELDS_DISPLAYED) {
        return 50;
      }
    }),
    isDefault: (key: string) => {
      return true;
    },
  },
  http: {
    basePath: '/',
  },
  dataViewFieldEditor: {
    openEditor: jest.fn(),
    userPermissions: {
      editIndexPattern: jest.fn(),
    },
  },
  navigation: {
    ui: { TopNavMenu },
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
} as unknown as DiscoverServices;
