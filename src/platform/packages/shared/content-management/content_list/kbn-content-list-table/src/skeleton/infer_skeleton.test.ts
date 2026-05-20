/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { inferColumnSkeleton } from './infer_skeleton';

type Col = EuiBasicTableColumn<ContentListItem>;

describe('inferColumnSkeleton', () => {
  it("returns a text-shape descriptor using the column's declared width", () => {
    const col: Col = { field: 'title', name: 'Title', width: '60%' };
    expect(inferColumnSkeleton(col)).toEqual({ shape: 'text', width: '60%' });
  });

  it('falls back to a default text width when the column has no width', () => {
    const col: Col = { field: 'title', name: 'Title' };
    expect(inferColumnSkeleton(col)).toMatchObject({ shape: 'text', width: '40%' });
  });

  it('returns a rectangle proportional to the action count for an actions column without a declared width', () => {
    const col: Col = {
      name: 'Actions',
      actions: [
        { name: 'edit', onClick: () => {} } as any,
        { name: 'del', onClick: () => {} } as any,
      ],
    };
    const result = inferColumnSkeleton(col);
    expect(result).toMatchObject({ shape: 'rectangle', height: 20 });
    // `2 * 36 + 12 = 84px` — mirrors the real `ActionsColumn` width formula.
    expect((result as { width: string }).width).toBe('84px');
  });

  it("honors the actions column's declared width when present", () => {
    const col: Col = {
      name: 'Actions',
      width: '100px',
      actions: [{ name: 'edit', onClick: () => {} } as any],
    };
    expect(inferColumnSkeleton(col)).toMatchObject({
      shape: 'rectangle',
      width: '100px',
    });
  });

  it('renders at least one action-sized block for an actions column with zero actions', () => {
    const col: Col = { name: 'Actions', actions: [] };
    const result = inferColumnSkeleton(col);
    // `1 * 36 + 12 = 48px` — single-action width with cell padding.
    expect((result as { width: string }).width).toBe('48px');
  });
});
