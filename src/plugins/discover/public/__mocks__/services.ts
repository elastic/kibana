/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { Observable } from 'rxjs';
import { DiscoverServices } from '../build_services';
import { dataPluginMock } from '../../../data/public/mocks';
import { chromeServiceMock, coreMock, docLinksServiceMock } from '../../../../core/public/mocks';
import { DEFAULT_COLUMNS_SETTING } from '../../common';
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
    chartsDefaultTheme: EUI_CHARTS_THEME_LIGHT.theme,
    chartsDefaultBaseTheme: EUI_CHARTS_THEME_LIGHT.theme,
    chartsTheme$: new Observable(),
    chartsBaseTheme$: new Observable(),
  },
} as unknown) as DiscoverServices;
