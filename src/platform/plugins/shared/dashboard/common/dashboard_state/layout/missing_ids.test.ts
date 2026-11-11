/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { assignMissingIds, getGeneratedIdPrefix } from './missing_ids';

const state = (overrides: Partial<DashboardState> = {}) =>
  ({ title: 'Logs', panels: [], ...overrides } as DashboardState);

const panel = (id?: string) => ({ ...(id !== undefined && { id }), type: 'testPanelType' });

describe('getGeneratedIdPrefix', () => {
  it('returns the default prefix when no id uses it', () => {
    expect(getGeneratedIdPrefix(state({ panels: [panel('a')] as DashboardState['panels'] }))).toBe(
      '__generated:'
    );
  });

  it('avoids ids of panels, sections, section children, and pinned panels', () => {
    const colliding = '__generated:x';
    const panels = {
      panel: [panel(colliding)],
      section: [{ id: colliding, title: 'Logs', collapsed: false, grid: { y: 0 }, panels: [] }],
      'section child': [
        { title: 'Logs', collapsed: false, grid: { y: 0 }, panels: [panel(colliding)] },
      ],
    };
    Object.values(panels).forEach((value) => {
      expect(getGeneratedIdPrefix(state({ panels: value as DashboardState['panels'] }))).toBe(
        '___generated:'
      );
    });
    expect(
      getGeneratedIdPrefix(
        state({ pinned_panels: [panel(colliding)] as unknown as DashboardState['pinned_panels'] })
      )
    ).toBe('___generated:');
  });

  it('avoids ids from any of the states', () => {
    expect(
      getGeneratedIdPrefix(
        state(),
        state({ panels: [panel('__generated:x')] as DashboardState['panels'] })
      )
    ).toBe('___generated:');
  });

  it('keeps extending the prefix until no id uses it', () => {
    expect(
      getGeneratedIdPrefix(
        state({
          panels: [panel('__generated:x'), panel('___generated:y')] as DashboardState['panels'],
        })
      )
    ).toBe('____generated:');
  });
});

describe('assignMissingIds', () => {
  it('assigns ids by position and keeps explicit ids', () => {
    expect(assignMissingIds([panel(), panel('explicit'), panel()], 'p')).toEqual([
      { id: 'p0', type: 'testPanelType' },
      { id: 'explicit', type: 'testPanelType' },
      { id: 'p2', type: 'testPanelType' },
    ]);
  });

  it('assigns ids to nested panels', () => {
    const [section] = assignMissingIds([{ ...panel(), panels: [panel(), panel()] }], 'p');

    expect(section.id).toBe('p0');
    expect(section.panels?.map(({ id }) => id)).toEqual(['p0:0', 'p0:1']);
  });

  it('does not mutate the items', () => {
    const items = [{ ...panel(), panels: [panel()] }];
    const original = JSON.stringify(items);

    assignMissingIds(items, 'p');

    expect(JSON.stringify(items)).toBe(original);
  });

  it('returns an empty array when there are no items', () => {
    expect(assignMissingIds(undefined, 'p')).toEqual([]);
  });
});
