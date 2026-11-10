/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDataGridRenderMode } from './get_data_grid_render_mode';

describe('getDataGridRenderMode', () => {
  it.each([
    ['edit', 'interactive'],
    ['view', 'interactive'],
    [undefined, 'interactive'],
    ['non-interactive', 'non-interactive'],
    ['print', 'print'],
  ] as const)('maps view mode %s to render mode %s', (viewMode, renderMode) => {
    expect(getDataGridRenderMode(viewMode)).toBe(renderMode);
  });
});
