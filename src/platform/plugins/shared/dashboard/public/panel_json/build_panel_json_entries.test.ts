/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GridData } from '@kbn/as-code-dashboard-schema';
import { buildPanelJsonEntries } from './build_panel_json_entries';

describe('buildPanelJsonEntries', () => {
  it('builds a panel entry that keeps the position and size of the panel', () => {
    // The dashboard layout also stores the section of the panel
    const grid = { x: 24, y: 42, w: 12, h: 8, sectionId: 'section-1' } as GridData;

    expect(
      buildPanelJsonEntries([{ type: 'markdown', grid, config: { content: '# Notes' } }])
    ).toEqual([
      { type: 'markdown', grid: { x: 24, y: 42, w: 12, h: 8 }, config: { content: '# Notes' } },
    ]);
  });
});
