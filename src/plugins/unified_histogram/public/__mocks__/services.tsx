/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
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
  lens: {
    EmbeddableComponent: jest.fn(() => null),
    navigateToPrefilledEditor: jest.fn(),
    stateHelperApi: jest.fn(() => {
      return {
        suggestions: jest.fn(() => allSuggestionsMock),
      };
    }),
    EditLensConfigPanelApi: jest
      .fn()
      .mockResolvedValue(() => <span>Lens Config Panel Component</span>),
  },
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
  expressions: expressionsPluginMock.createStartContract(),
  capabilities: {
    dashboard: {
      showWriteControls: true,
    },
  },
} as unknown as UnifiedHistogramServices;
