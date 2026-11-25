/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import {
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
} from '@kbn/controls-constants';
import { getDuplicate, type PanelsCache } from './get_duplicate';

const createControlState = (variableName: string, selectedOptions: string[] = ['US']) => ({
  ...DEFAULT_ESQL_OPTIONS_LIST_STATE,
  control_type: 'STATIC_VALUES' as const,
  available_options: selectedOptions,
  variable_name: variableName,
  variable_type: 'values' as const,
  selected_options: selectedOptions,
});

const isDuplicate = (
  incomingState: { variable_name?: string },
  existingState: { variable_name?: string }
) =>
  Boolean(
    incomingState.variable_name && incomingState.variable_name === existingState.variable_name
  );

const definition = {
  type: ESQL_CONTROL,
  buildEmbeddable: jest.fn(),
  isDuplicate,
};

describe('getDuplicate', () => {
  const initialState: Pick<DashboardState, 'panels' | 'pinned_panels'> = {
    panels: [
      {
        id: 'gridControl',
        type: ESQL_CONTROL,
        grid: { w: 1, h: 1, x: 0, y: 0 },
        config: createControlState('service_name', ['web']),
      },
      {
        id: 'section1',
        title: 'Section 1',
        collapsed: false,
        grid: { y: 1 },
        panels: [
          {
            id: 'sectionControl',
            type: ESQL_CONTROL,
            grid: { w: 1, h: 1, x: 0, y: 0 },
            config: createControlState('env_name', ['prod']),
          },
        ],
      },
    ],
    pinned_panels: [
      {
        ...DEFAULT_PINNED_CONTROL_STATE,
        id: 'pinnedControl',
        type: ESQL_CONTROL,
        config: createControlState('geo_dest', ['US']),
      },
    ],
  };

  const controlPackage = (variableName: string, selectedOptions: string[]) => ({
    type: ESQL_CONTROL,
    serializedState: createControlState(variableName, selectedOptions),
  });

  test('returns the matching grid or pinned panel', () => {
    expect(
      getDuplicate(controlPackage('service_name', ['api']), definition, initialState, new Map())?.id
    ).toBe('gridControl');
    expect(
      getDuplicate(controlPackage('geo_dest', ['CN']), definition, initialState, new Map())?.id
    ).toBe('pinnedControl');
  });

  test('does not match a panel inside a section', () => {
    expect(
      getDuplicate(controlPackage('env_name', ['staging']), definition, initialState, new Map())
    ).toBeUndefined();
  });

  test('returns undefined when isDuplicate returns false', () => {
    expect(
      getDuplicate(controlPackage('geo_src', ['FR']), definition, initialState, new Map())
    ).toBeUndefined();
  });

  test('returns undefined when there is no definition or the definition has no isDuplicate', () => {
    expect(
      getDuplicate(controlPackage('geo_dest', ['US']), undefined, initialState, new Map())
    ).toBeUndefined();
    expect(
      getDuplicate(
        controlPackage('geo_dest', ['US']),
        { ...definition, isDuplicate: undefined },
        initialState,
        new Map()
      )
    ).toBeUndefined();
  });

  test('reuses the per-type panel cache when provided', () => {
    const cachedPanel = {
      id: 'cachedControl',
      type: ESQL_CONTROL,
      state: createControlState('cached_var', ['US']),
    };
    const cache: PanelsCache = new Map([[ESQL_CONTROL, [cachedPanel]]]);

    expect(
      getDuplicate(
        controlPackage('cached_var', ['CN']),
        definition,
        { panels: [], pinned_panels: [] },
        cache
      )
    ).toBe(cachedPanel);
  });

  test('skips a package that already has an embeddableId', () => {
    expect(
      getDuplicate(
        { ...controlPackage('geo_dest', ['CN']), embeddableId: 'existingId' },
        definition,
        initialState,
        new Map()
      )
    ).toBeUndefined();
  });

  test('returns undefined when isDuplicate throws', () => {
    expect(
      getDuplicate(
        controlPackage('geo_dest', ['CN']),
        {
          ...definition,
          isDuplicate: () => {
            throw new Error('Unexpected state');
          },
        },
        initialState,
        new Map()
      )
    ).toBeUndefined();
  });
});
