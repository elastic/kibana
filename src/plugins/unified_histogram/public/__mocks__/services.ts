/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { UnifiedHistogramServices } from '../types';
import { allSuggestionsMock } from './suggestions';

const dataPlugin = dataPluginMock.createStartContract();
dataPlugin.query.filterManager.getFilters = jest.fn(() => []);

export const unifiedHistogramServicesMock = {
  data: dataPlugin,
  fieldFormats: fieldFormatsMock,
  uiActions: {
    getTriggerCompatibleActions: jest.fn(() => Promise.resolve([])),
  },
  uiSettings: {
    get: jest.fn(),
    isDefault: jest.fn(() => true),
  },
  theme: {
    useChartsTheme: jest.fn(() => EUI_CHARTS_THEME_LIGHT.theme),
    useChartsBaseTheme: jest.fn(() => EUI_CHARTS_THEME_LIGHT.theme),
  },
  lens: {
    EmbeddableComponent: jest.fn(() => null),
    navigateToPrefilledEditor: jest.fn(),
    stateHelperApi: jest.fn(() => {
      return {
        suggestions: jest.fn(() => allSuggestionsMock),
      };
    }),
  },
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
  expressions: expressionsPluginMock.createStartContract(),
} as unknown as UnifiedHistogramServices;
