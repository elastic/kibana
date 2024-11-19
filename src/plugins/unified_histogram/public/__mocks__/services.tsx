/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of } from 'rxjs';
import { calculateBounds } from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { UnifiedHistogramServices } from '../types';
import { allSuggestionsMock } from './suggestions';

const dataPlugin = dataPluginMock.createStartContract();
dataPlugin.query.filterManager.getFilters = jest.fn(() => []);

dataPlugin.query.timefilter.timefilter = {
  ...dataPlugin.query.timefilter.timefilter,
  calculateBounds: jest.fn((timeRange) => calculateBounds(timeRange)),
};

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
  expressions: {
    ...expressionsPluginMock.createStartContract(),
    run: jest.fn(() =>
      of({
        partial: false,
        result: {
          rows: [{}, {}, {}],
        },
      })
    ),
  },
  capabilities: {
    dashboard: {
      showWriteControls: true,
    },
  },
} as unknown as UnifiedHistogramServices;
