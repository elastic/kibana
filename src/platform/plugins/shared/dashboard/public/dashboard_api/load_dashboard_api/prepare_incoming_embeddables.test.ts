/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { embeddableService } from '../../services/kibana_services';
import { prepareIncomingEmbeddables } from './prepare_incoming_embeddables';

jest.mock('../../panel_placement/get_placement_hints', () => ({
  getPlacementHints: jest.fn().mockResolvedValue({ width: 1, height: 1 }),
}));

const controlPanel = (id: string) => ({
  id,
  type: ESQL_CONTROL,
  grid: { w: 1, h: 1, x: 0, y: 0 },
  config: { variable_name: 'service_name' },
});

describe('prepareIncomingEmbeddables', () => {
  beforeEach(() => {
    jest.spyOn(embeddableService, 'getEmbeddableDefinition').mockResolvedValue({
      type: ESQL_CONTROL,
      buildEmbeddable: jest.fn(),
      isDuplicate: (a: { variable_name?: string }, b: { variable_name?: string }) =>
        a.variable_name === b.variable_name,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const incoming = [{ type: ESQL_CONTROL, serializedState: { variable_name: 'service_name' } }];

  test('fills in size and resolves duplicates against the state', async () => {
    const state: Pick<DashboardState, 'panels' | 'pinned_panels'> = {
      panels: [controlPanel('topLevel')],
      pinned_panels: [],
    };
    const [prepared] = await prepareIncomingEmbeddables(incoming, () => state);
    expect(prepared.size).toEqual({ width: 1, height: 1 });
    expect(prepared.embeddableId).toBe('topLevel');
  });

  test('reads state after async loading completes', async () => {
    let state: Pick<DashboardState, 'panels' | 'pinned_panels'> = {
      panels: [controlPanel('topLevel')],
      pinned_panels: [],
    };
    // layout changes while definitions load: the matching control moves into a section
    jest.spyOn(embeddableService, 'getEmbeddableDefinition').mockImplementation(async () => {
      state = {
        panels: [
          {
            id: 'section1',
            title: 'Section 1',
            collapsed: false,
            grid: { y: 0 },
            panels: [controlPanel('topLevel')],
          },
        ],
        pinned_panels: [],
      };
      return {
        type: ESQL_CONTROL,
        buildEmbeddable: jest.fn(),
        isDuplicate: (a: { variable_name?: string }, b: { variable_name?: string }) =>
          a.variable_name === b.variable_name,
      };
    });

    const [prepared] = await prepareIncomingEmbeddables(incoming, () => state);
    expect(prepared.embeddableId).toBeUndefined();
  });

  test('keeps the embeddableId of a package that already has one', async () => {
    const [prepared] = await prepareIncomingEmbeddables(
      [{ ...incoming[0], embeddableId: 'existingId' }],
      () => ({ panels: [controlPanel('topLevel')], pinned_panels: [] })
    );
    expect(prepared.embeddableId).toBe('existingId');
  });

  test('treats a rejected definition load as no duplicate', async () => {
    jest
      .spyOn(embeddableService, 'getEmbeddableDefinition')
      .mockRejectedValue(new Error('ChunkLoadError'));
    const [prepared] = await prepareIncomingEmbeddables(incoming, () => ({
      panels: [controlPanel('topLevel')],
      pinned_panels: [],
    }));
    expect(prepared.embeddableId).toBeUndefined();
  });
});
