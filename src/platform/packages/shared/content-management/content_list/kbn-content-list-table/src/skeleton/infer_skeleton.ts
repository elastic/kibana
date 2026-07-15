/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { SkeletonDescriptor } from '@kbn/content-list-assembly';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Default width used when a column does not declare one. Wide enough to
 * feel like a real text column without looking like a full-width banner.
 */
const DEFAULT_TEXT_WIDTH = '40%';

/**
 * Infer a {@link SkeletonDescriptor} from a resolved `EuiBasicTableColumn`
 * for presets (or custom columns) that did not supply their own `skeleton`
 * callback.
 *
 * Uses only the metadata the real resolver already produces — `actions`
 * (present for action columns) and explicit `width`.
 * No preset-specific knowledge is encoded here; preset authors can opt in
 * to higher fidelity by supplying a `skeleton` callback via
 * `column.createPreset({ skeleton })`.
 *
 * Precedence:
 * 1. Column has an `actions` array → narrow rectangle proportional to the
 *    action count. Action columns would otherwise default to the full
 *    text-width skeleton, which reads wrong for an icon-only column.
 * 2. Column carries no `actions` → a text-shape skeleton at the column's
 *    declared `width`, or the default when absent.
 */
export const inferColumnSkeleton = (
  col: EuiBasicTableColumn<ContentListItem>
): SkeletonDescriptor => {
  if ('actions' in col && Array.isArray(col.actions)) {
    // Mirror the real `ActionsColumn` width formula so skeletons don't jump
    // when the row's icons fade in: each `EuiButtonIcon` `size="s"` is 32px,
    // separated by 4px gaps inside an 8px-padded cell. Presets that want
    // per-action fidelity should supply their own `skeleton` callback (see
    // `ActionsColumn`).
    const count = Math.max(col.actions.length, 1);
    const inferredWidth = `${count * 36 + 12}px`;
    return {
      shape: 'rectangle',
      width: 'width' in col && col.width ? col.width : inferredWidth,
      height: 20,
    };
  }

  const width = 'width' in col && col.width ? col.width : DEFAULT_TEXT_WIDTH;
  return { shape: 'text', width };
};
