/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

/**
 * Unified (inline) diff layout selectors — Monaco positions `.editor.original` at left:0
 * with width = max(5px, decorationsLeft). Collapse original and stretch modified to
 * prevent YAML bleed into the gutter. Scoped to `:not(.side-by-side)` only.
 */
export const WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR =
  '& .monaco-diff-editor:not(.side-by-side) .editor.original';

export const WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR =
  '& .monaco-diff-editor:not(.side-by-side) .editor.modified';

export const buildWorkflowChangeHistoryUnifiedDiffLayoutStyles = ({
  euiTheme,
}: UseEuiTheme): Record<string, Record<string, string | number>> => ({
  [WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR]: {
    width: '0 !important',
    minWidth: '0 !important',
    overflow: 'hidden',
    visibility: 'hidden',
    pointerEvents: 'none',
  },
  [WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR]: {
    left: '0 !important',
    right: '0',
    width: 'auto !important',
  },
  '& .monaco-diff-editor.side-by-side .editor.original, & .monaco-diff-editor.side-by-side .editor.modified':
    {
      boxSizing: 'border-box',
      paddingLeft: euiTheme.size.m,
    },
  '& .monaco-diff-editor.side-by-side .insert-sign, & .monaco-diff-editor.side-by-side .delete-sign':
    {
      justifyContent: 'center',
    },
});
