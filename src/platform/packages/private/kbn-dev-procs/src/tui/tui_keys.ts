/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InkKey } from './ink_module';
import { ALL } from './tui_state';
import type { TuiAction, TuiState } from './tui_state';

export type ProcessControl = 'restart' | 'start' | 'stop' | 'quit';

export interface KeyResult {
  readonly actions: readonly TuiAction[];
  readonly control?: ProcessControl;
}

/** Maps a key press to the actions it triggers; process control is returned separately as it is async. */
export const handleKey = (
  state: TuiState,
  input: string,
  key: InkKey,
  pageSize: number
): KeyResult => {
  if (state.isQuitting) {
    return { actions: [] };
  }
  if (state.isEditingQuery) {
    if (key.return) return { actions: [{ type: 'submitQuery' }] };
    if (key.escape) return { actions: [{ type: 'clearQuery' }] };
    if (key.backspace || key.delete) return { actions: [{ type: 'queryBackspace' }] };
    if (input && !key.ctrl) return { actions: [{ type: 'queryInput', text: input }] };
    return { actions: [] };
  }
  if (input === 'q' || (key.ctrl && input === 'c')) {
    return { actions: [{ type: 'quit' }], control: 'quit' };
  }
  if (key.upArrow || input === 'k') return { actions: [{ type: 'select', direction: -1 }] };
  if (key.downArrow || input === 'j') return { actions: [{ type: 'select', direction: 1 }] };
  if (key.pageUp || input === 'u') return { actions: [{ type: 'scroll', delta: pageSize }] };
  if (key.pageDown || input === 'd') return { actions: [{ type: 'scroll', delta: -pageSize }] };
  if (input === 'G') return { actions: [{ type: 'scrollToBottom' }] };
  if (input === '/') return { actions: [{ type: 'editQuery' }] };
  if (key.escape) return { actions: [{ type: 'clearQuery' }] };
  if (state.selected !== ALL) {
    if (input === 'r') return { actions: [], control: 'restart' };
    if (input === 's') return { actions: [], control: 'start' };
    if (input === 'x') return { actions: [], control: 'stop' };
  }
  return { actions: [] };
};
