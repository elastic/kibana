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
import { embeddableService } from '../../services/kibana_services';
import { getDuplicate, type PanelsCache } from './get_duplicate';

const createControlState = (variableName: string, selectedOptions: string[] = ['US']) => ({
  ...DEFAULT_ESQL_OPTIONS_LIST_STATE,
  control_type: 'STATIC_VALUES' as const,
  available_options: selectedOptions,
  variable_name: variableName,
  variable_type: 'values' as const,
  selected_options: selectedOptions,
});

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

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(embeddableService, 'getEmbeddableDefinition')
      .mockImplementation(async (type: string) =>
        type === ESQL_CONTROL
          ? {
              type: ESQL_CONTROL,
              buildEmbeddable: jest.fn(),
              isDuplicate: (
                incomingState: { variable_name?: string },
                existingState: { variable_name?: string }
              ) =>
                Boolean(
                  incomingState.variable_name &&
                    incomingState.variable_name === existingState.variable_name
                ),
            }
          : {
              type,
              buildEmbeddable: jest.fn(),
            }
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns the matching grid, section, or pinned panel', async () => {
    const cache: PanelsCache = new Map();

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('service_name', ['api']),
        },
        initialState,
        cache
      )
    ).resolves.toEqual({
      id: 'gridControl',
      type: ESQL_CONTROL,
      state: createControlState('service_name', ['web']),
    });

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('env_name', ['staging']),
        },
        initialState,
        cache
      )
    ).resolves.toEqual({
      id: 'sectionControl',
      type: ESQL_CONTROL,
      state: createControlState('env_name', ['prod']),
    });

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('geo_dest', ['CN']),
        },
        initialState,
        cache
      )
    ).resolves.toEqual({
      id: 'pinnedControl',
      type: ESQL_CONTROL,
      state: createControlState('geo_dest', ['US']),
    });
  });

  test('returns undefined when isDuplicate returns false or the type has no isDuplicate', async () => {
    const cache: PanelsCache = new Map();

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('geo_src', ['FR']),
        },
        initialState,
        cache
      )
    ).resolves.toBeUndefined();

    await expect(
      getDuplicate(
        {
          type: 'lens',
          serializedState: { title: 'Chart' },
        },
        {
          panels: [
            {
              id: 'existingChart',
              type: 'lens',
              grid: { w: 1, h: 1, x: 0, y: 0 },
              config: { title: 'Chart' },
            },
          ],
          pinned_panels: [],
        },
        cache
      )
    ).resolves.toBeUndefined();
  });

  test('skips a package that already has an embeddableId without loading its definition', async () => {
    await expect(
      getDuplicate(
        {
          embeddableId: 'existingId',
          type: ESQL_CONTROL,
          serializedState: createControlState('geo_dest', ['CN']),
        },
        initialState,
        new Map()
      )
    ).resolves.toBeUndefined();

    expect(embeddableService.getEmbeddableDefinition).not.toHaveBeenCalled();
  });

  test('reuses the per-type panel cache when provided', async () => {
    const cachedPanel = {
      id: 'cachedControl',
      type: ESQL_CONTROL,
      state: createControlState('cached_var', ['US']),
    };
    const cache: PanelsCache = new Map([[ESQL_CONTROL, [cachedPanel]]]);

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('cached_var', ['CN']),
        },
        { panels: [], pinned_panels: [] },
        cache
      )
    ).resolves.toBe(cachedPanel);
  });

  test('returns undefined when loading the embeddable definition rejects', async () => {
    jest
      .spyOn(embeddableService, 'getEmbeddableDefinition')
      .mockRejectedValueOnce(new Error('ChunkLoadError'));

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('geo_dest', ['CN']),
        },
        initialState,
        new Map()
      )
    ).resolves.toBeUndefined();
  });

  test('returns undefined when isDuplicate throws', async () => {
    jest.spyOn(embeddableService, 'getEmbeddableDefinition').mockResolvedValueOnce({
      type: ESQL_CONTROL,
      buildEmbeddable: jest.fn(),
      isDuplicate: () => {
        throw new Error('Unexpected state');
      },
    });

    await expect(
      getDuplicate(
        {
          type: ESQL_CONTROL,
          serializedState: createControlState('geo_dest', ['CN']),
        },
        initialState,
        new Map()
      )
    ).resolves.toBeUndefined();
  });
});
