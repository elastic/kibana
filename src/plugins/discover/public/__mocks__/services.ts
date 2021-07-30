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
  DEFAULT_COLUMNS_SETTING,
  SAMPLE_SIZE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../common';
import { savedSearchMock } from './saved_search';
import { UI_SETTINGS } from '../../../data/common';
import { TopNavMenu } from '../../../navigation/public';
const dataPlugin = dataPluginMock.createStartContract();

export const discoverServiceMock = ({
  core: coreMock.createStart(),
  chrome: chromeServiceMock.createStartContract(),
  history: () => ({
    location: {
      search: '',
    },
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
  filterManager: dataPlugin.query.filterManager,
  uiSettings: {
    get: (key: string) => {
      if (key === 'fields:popularLimit') {
        return 5;
      } else if (key === DEFAULT_COLUMNS_SETTING) {
        return [];
      } else if (key === UI_SETTINGS.META_FIELDS) {
        return [];
      } else if (key === SAMPLE_SIZE_SETTING) {
        return 250;
      } else if (key === SORT_DEFAULT_ORDER_SETTING) {
        return 'desc';
      }
    },
    isDefault: (key: string) => {
      return true;
    },
  },
  indexPatternFieldEditor: {
    openEditor: jest.fn(),
    userPermissions: {
      editIndexPattern: jest.fn(),
    },
  },
  getSavedSearchById: (id?: string) => Promise.resolve(savedSearchMock),
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
} as unknown) as DiscoverServices;
