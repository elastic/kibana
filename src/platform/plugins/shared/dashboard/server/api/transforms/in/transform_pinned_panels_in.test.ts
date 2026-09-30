/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { CONTROL_WIDTH_SMALL } from '@kbn/controls-constants';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { transformPinnedPanelsIn } from './transform_pinned_panels_in';

const mockKibanaServices = vi.hoisted(() => ({ embeddableService: undefined as unknown }));
vi.mock('../../../kibana_services', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  get embeddableService() {
    return mockKibanaServices.embeddableService;
  },
}));

vi.mock('uuid', () => {
  const mocked = {
    v4: vi.fn(() => 'mock-uuid'),
  };
  return { ...mocked, default: mocked };
});

describe('transformPinnedPanelsIn', () => {
  beforeAll(() => {
    mockKibanaServices.embeddableService = {
      getTransforms: vi.fn(),
    };
  });

  const mockPinnedPanelsState: Required<DashboardState>['pinned_panels'] = [
    {
      id: 'control1',
      type: 'type1',
      width: CONTROL_WIDTH_SMALL,
      config: { bizz: 'buzz' },
      grow: false,
    } as unknown as Required<DashboardState>['pinned_panels'][number],
    {
      type: 'type2',
      grow: true,
      width: CONTROL_WIDTH_SMALL,
      config: { boo: 'bear' },
    } as unknown as Required<DashboardState>['pinned_panels'][number],
  ];

  it('should transform pinned panels state correctly', () => {
    const result = transformPinnedPanelsIn(mockPinnedPanelsState);

    expect(result.pinnedPanels).toEqual({
      control1: {
        order: 0,
        type: 'type1',
        width: 'small',
        grow: false,
        config: { bizz: 'buzz' },
      },
      'mock-uuid': {
        order: 1,
        type: 'type2',
        width: 'small',
        grow: true,
        config: { boo: 'bear' },
      },
    });
  });

  it('should handle empty pinned panels array', () => {
    const pinnedPanelsState: Required<DashboardState>['pinned_panels'] = [];
    const result = transformPinnedPanelsIn(pinnedPanelsState);
    expect(result).toEqual({ pinnedPanels: {}, references: [] });
  });
});

describe('validation', () => {
  beforeAll(() => {
    mockKibanaServices.embeddableService = {
      getTransforms: () => ({
        transformIn: () => {
          throw new Error('Transform in error.');
        },
      }),
    };
  });

  it('should throw when transform in fails', () => {
    const pinnedPanels = [
      {
        type: 'type2',
        grow: true,
        width: CONTROL_WIDTH_SMALL,
        config: { boo: 'bear' },
      } as unknown as Required<DashboardState>['pinned_panels'][number],
    ];
    expect(() => transformPinnedPanelsIn(pinnedPanels)).toThrowErrorMatchingInlineSnapshot(
      `[TransformPanelsInError: Unable to transform 1 pinned panels]`
    );
  });
});
