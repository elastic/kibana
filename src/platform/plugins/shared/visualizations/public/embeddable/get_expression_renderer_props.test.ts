/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExpressionRendererProps } from './get_expression_renderer_props';
import type { Vis } from '../vis';
import type { VisParams } from '../types';
import { PersistedState } from '../persisted_state';

jest.mock('./to_ast', () => ({
  toExpressionAst: jest.fn().mockResolvedValue('mock expression'),
}));

jest.mock('../services', () => ({
  getExecutionContext: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue({}),
  }),
  getTimeFilter: jest.fn().mockReturnValue({
    getTime: jest.fn().mockReturnValue({ from: 'now-15m', to: 'now' }),
  }),
}));

const createMockVis = (overrides: Partial<Vis<VisParams>> = {}): Vis<VisParams> =>
  ({
    id: 'test-vis-id',
    title: 'Test Visualization',
    type: {
      name: 'area',
      inspectorAdapters: undefined,
      getExpressionVariables: jest.fn().mockResolvedValue({}),
      ...overrides.type,
    } as any,
    uiState: new PersistedState(),
    params: {} as VisParams,
    description: '',
    data: {},
    ...overrides,
  } as Vis<VisParams>);

describe('getExpressionRendererProps', () => {
  describe('projectRouting handling', () => {
    it('should include projectRouting in search context when provided', async () => {
      const vis = createMockVis();
      const result = await getExpressionRendererProps({
        unifiedSearch: {
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        projectRouting: '_alias:_origin',
        timeRange: { from: 'now-15m', to: 'now' },
        disableTriggers: false,
        settings: {
          syncColors: true,
          syncCursor: true,
          syncTooltips: false,
        },
        vis,
        onRender: jest.fn(),
        onEvent: jest.fn(),
        onData: jest.fn(),
      });

      expect(result.params).toBeDefined();
      expect(result.params?.searchContext).toEqual(
        expect.objectContaining({
          projectRouting: '_alias:_origin',
        })
      );
    });

    it('should include undefined projectRouting in search context when not provided', async () => {
      const vis = createMockVis();
      const result = await getExpressionRendererProps({
        unifiedSearch: {
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        projectRouting: undefined,
        timeRange: { from: 'now-15m', to: 'now' },
        disableTriggers: false,
        settings: {
          syncColors: true,
          syncCursor: true,
          syncTooltips: false,
        },
        vis,
        onRender: jest.fn(),
        onEvent: jest.fn(),
        onData: jest.fn(),
      });

      expect(result.params).toBeDefined();
      expect(result.params?.searchContext).toEqual(
        expect.objectContaining({
          projectRouting: undefined,
        })
      );
    });

    it('should handle projectRouting set to ALL', async () => {
      const vis = createMockVis();
      const result = await getExpressionRendererProps({
        unifiedSearch: {
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        projectRouting: '_alias:*',
        timeRange: { from: 'now-15m', to: 'now' },
        disableTriggers: false,
        settings: {
          syncColors: true,
          syncCursor: true,
          syncTooltips: false,
        },
        vis,
        onRender: jest.fn(),
        onEvent: jest.fn(),
        onData: jest.fn(),
      });

      expect(result.params).toBeDefined();
      expect(result.params?.searchContext).toEqual(
        expect.objectContaining({
          projectRouting: '_alias:*',
        })
      );
    });
  });
});
