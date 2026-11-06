/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildWorkflowChangeHistoryUnifiedDiffLayoutStyles,
  WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR,
  WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR,
} from './workflow_change_history_unified_diff_layout';

describe('workflow_change_history_unified_diff_layout', () => {
  const mockEuiTheme = {
    size: { m: '16px', s: '8px' },
  };

  it('keeps unified diff gutter-collapse selectors stable', () => {
    expect(WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR).toBe(
      '& .monaco-diff-editor:not(.side-by-side) .editor.original'
    );
    expect(WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR).toBe(
      '& .monaco-diff-editor:not(.side-by-side) .editor.modified'
    );
  });

  it('collapses the original pane and stretches the modified pane in unified mode', () => {
    const styles = buildWorkflowChangeHistoryUnifiedDiffLayoutStyles({
      euiTheme: mockEuiTheme,
    } as Parameters<typeof buildWorkflowChangeHistoryUnifiedDiffLayoutStyles>[0]);

    expect(styles[WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR]).toMatchObject({
      width: '0 !important',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    expect(styles[WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR]).toMatchObject({
      left: '0 !important',
      width: 'auto !important',
    });
  });
});
