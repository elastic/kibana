/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultTimeColumnWidth } from '@kbn/unified-data-table';
import {
  computeTanStackColumnLayout,
  getTimeColumnWidth,
  LEADING_CONTROL_COLUMNS_WIDTH,
} from './tanstack_column_layout';
import { DEFAULT_COL_WIDTH } from './tanstack_data_grid.styles';

describe('tanstack column layout', () => {
  it('uses the unified default time column width', () => {
    expect(getTimeColumnWidth('timestamp', {}, undefined)).toBe(defaultTimeColumnWidth);
  });

  it('keeps the timestamp column fixed while other columns flex to fill the grid', () => {
    const layout = computeTanStackColumnLayout({
      containerWidth: 1000,
      timeFieldName: 'timestamp',
      columnSizing: {},
      dataColumns: [
        { id: 'timestamp', isTimestamp: true },
        { id: 'message' },
        { id: 'extension' },
      ],
    });

    expect(layout.mode).toBe('flex');
    expect(layout.gridWidth).toBe('100%');
    expect(layout.getColumnStyle({ id: 'timestamp', isTimestamp: true })).toEqual({
      width: defaultTimeColumnWidth,
      flexShrink: 0,
    });
    expect(layout.getColumnStyle({ id: 'message' })).toEqual({
      flex: '1 1 0',
      minWidth: 60,
      width: 0,
    });
  });

  it('switches to horizontal scroll when columns no longer fit at minimum width', () => {
    const layout = computeTanStackColumnLayout({
      containerWidth: 500,
      timeFieldName: 'timestamp',
      columnSizing: {},
      dataColumns: [
        { id: 'timestamp', isTimestamp: true },
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
        { id: 'e' },
        { id: 'f' },
      ],
    });

    expect(layout.mode).toBe('scroll');
    expect(layout.gridWidth).toBe(
      LEADING_CONTROL_COLUMNS_WIDTH + defaultTimeColumnWidth + 6 * DEFAULT_COL_WIDTH
    );
  });
});
