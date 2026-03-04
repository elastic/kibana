/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { getUnmappedPanelCountsFromDashboardState } from './unmapped_panel_counts';

const mockGetTransforms = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
});

describe('dashboard api telemetry - getUnmappedPanelCountsFromDashboardState', () => {
  it('counts panels without schemas', () => {
    mockGetTransforms.mockImplementation(() => undefined);
    const result = getUnmappedPanelCountsFromDashboardState({
      title: 't',
      panels: [{ type: 'noSchema', config: {}, grid: { x: 0, y: 0, w: 24, h: 15 }, uid: 'p1' }],
    });
    expect(result).toEqual({ total: 1, byType: { noSchema: 1 } });
  });

  it('counts panels rejected by throwOnUnmappedPanel', () => {
    mockGetTransforms.mockImplementation(() => ({
      schema: schema.any(),
      throwOnUnmappedPanel: () => {
        throw new Error('bad');
      },
    }));
    const result = getUnmappedPanelCountsFromDashboardState({
      title: 't',
      panels: [{ type: 'lens', config: {}, grid: { x: 0, y: 0, w: 24, h: 15 }, uid: 'p1' }],
    });
    expect(result).toEqual({ total: 1, byType: { lens: 1 } });
  });

  it('counts panels with enhancements key (create/update rejection)', () => {
    mockGetTransforms.mockImplementation(() => ({
      schema: schema.any(),
    }));
    const result = getUnmappedPanelCountsFromDashboardState({
      title: 't',
      panels: [
        {
          type: 'typeWithSchema',
          config: { enhancements: {} },
          grid: { x: 0, y: 0, w: 24, h: 15 },
          uid: 'p1',
        },
      ],
    });
    expect(result).toEqual({ total: 1, byType: { typeWithSchema: 1 } });
  });

  it('includes pinned panels and section panels', () => {
    mockGetTransforms.mockImplementation((type: string) => {
      if (type === 'ok') return { schema: schema.any() };
      return undefined;
    });
    const result = getUnmappedPanelCountsFromDashboardState({
      title: 't',
      pinned_panels: [{ type: 'badPinned', config: {}, uid: 'pin1' }],
      panels: [
        {
          title: 'section 1',
          grid: { y: 0 },
          panels: [
            { type: 'ok', config: {}, grid: { x: 0, y: 0, w: 24, h: 15 }, uid: 's1p1' },
            { type: 'badInSection', config: {}, grid: { x: 0, y: 0, w: 24, h: 15 }, uid: 's1p2' },
          ],
        },
      ],
    });
    expect(result).toEqual({ total: 2, byType: { badPinned: 1, badInSection: 1 } });
  });
});
