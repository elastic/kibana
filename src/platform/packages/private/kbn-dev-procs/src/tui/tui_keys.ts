/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SettingRow } from '../settings/types';
import type { InkKey } from './ink_module';
import { ALL, getSelectedSetting } from './tui_state';
import type { TuiAction, TuiState } from './tui_state';

/** Something a key asks for that is async, so the app runs it instead of the reducer. */
export type Control =
  | { readonly type: 'quit' | 'restart' | 'start' | 'stop' }
  | { readonly type: 'setSetting'; readonly row: SettingRow; readonly input: string }
  | { readonly type: 'unsetSetting'; readonly row: SettingRow }
  /** Asks for the arguments of the selected tool, to start it. */
  | { readonly type: 'editToolArgs' }
  | { readonly type: 'startTool'; readonly input: string };

export interface KeyResult {
  readonly actions: readonly TuiAction[];
  readonly control?: Control;
}

export interface PaneSize {
  /** Rows of output or settings the pane shows. */
  readonly visibleRows: number;
  /** How far PgUp and PgDn move. */
  readonly pageSize: number;
}

const MASKED = '••••';
const BOOLEAN_DEFAULT = /^default (true|false)$/;

/** The value space switches a boolean setting to, or undefined when the setting is not a boolean. */
export const getToggledValue = ({ value, detail }: SettingRow): string | undefined => {
  if (value === 'true' || value === 'false') {
    return value === 'true' ? 'false' : 'true';
  }
  if (value !== undefined) {
    return undefined;
  }
  const defaultValue = detail ? BOOLEAN_DEFAULT.exec(detail)?.[1] : undefined;
  if (defaultValue) {
    return defaultValue === 'true' ? 'false' : 'true';
  }
  // Launch flags that can be switched on, as well as boolean settings.
  return detail && /^(boolean|switch)/.test(detail) ? 'true' : undefined;
};

const handleValueEditKey = (state: TuiState, input: string, key: InkKey): KeyResult => {
  const { valueEdit } = state;
  if (!valueEdit) {
    return { actions: [] };
  }
  if (key.return) {
    const { target, text } = valueEdit;
    return {
      actions: [{ type: 'endValueEdit' }],
      control:
        target.type === 'setting'
          ? { type: 'setSetting', row: target.row, input: text }
          : { type: 'startTool', input: text },
    };
  }
  if (key.escape) return { actions: [{ type: 'endValueEdit' }] };
  if (key.backspace || key.delete) return { actions: [{ type: 'valueBackspace' }] };
  if (input && !key.ctrl) return { actions: [{ type: 'valueInput', text: input }] };
  return { actions: [] };
};

const handleSettingsKey = (
  state: TuiState,
  input: string,
  key: InkKey,
  { visibleRows, pageSize }: PaneSize
): KeyResult | undefined => {
  const move = (delta: number): KeyResult => ({
    actions: [{ type: 'moveCursor', delta, height: visibleRows }],
  });
  if (key.upArrow || input === 'k') return move(-1);
  if (key.downArrow || input === 'j') return move(1);
  if (key.pageUp) return move(-pageSize);
  if (key.pageDown) return move(pageSize);

  const row = getSelectedSetting(state);
  if (!row) {
    return undefined;
  }
  if (input === ' ') {
    const value = getToggledValue(row);
    return value === undefined
      ? {
          actions: [
            {
              type: 'notice',
              text: `${row.key} is not a boolean; press e to edit its value`,
              isError: true,
            },
          ],
        }
      : { actions: [], control: { type: 'setSetting', row, input: value } };
  }
  if (input === 'e' || key.return) {
    const text = row.value === undefined || row.value === MASKED ? '' : row.value;
    return {
      actions: [{ type: 'startValueEdit', target: { type: 'setting', row }, label: row.key, text }],
    };
  }
  if (input === 'u') {
    return { actions: [], control: { type: 'unsetSetting', row } };
  }
  return undefined;
};

/** Maps a key press to the actions it triggers, and to the async control the app runs. */
export const handleKey = (
  state: TuiState,
  input: string,
  key: InkKey,
  size: PaneSize
): KeyResult => {
  if (state.isQuitting) {
    return { actions: [] };
  }
  if (state.valueEdit) {
    return handleValueEditKey(state, input, key);
  }
  if (state.isEditingQuery) {
    if (key.return) return { actions: [{ type: 'submitQuery' }] };
    if (key.escape) return { actions: [{ type: 'clearQuery' }] };
    if (key.backspace || key.delete) return { actions: [{ type: 'queryBackspace' }] };
    if (input && !key.ctrl) return { actions: [{ type: 'queryInput', text: input }] };
    return { actions: [] };
  }
  if (input === 'q' || (key.ctrl && input === 'c')) {
    return { actions: [{ type: 'quit' }], control: { type: 'quit' } };
  }
  if (key.leftArrow || input === 'h') return { actions: [{ type: 'select', direction: -1 }] };
  if (key.rightArrow || input === 'l') return { actions: [{ type: 'select', direction: 1 }] };
  if (key.tab) return { actions: [{ type: 'cyclePane' }] };
  if (input === '/') return { actions: [{ type: 'editQuery' }] };
  if (key.escape) return { actions: [{ type: 'clearQuery' }] };

  if (state.pane !== 'logs') {
    const result = handleSettingsKey(state, input, key, size);
    if (result) {
      return result;
    }
  } else {
    if (key.upArrow || input === 'k') return { actions: [{ type: 'select', direction: -1 }] };
    if (key.downArrow || input === 'j') return { actions: [{ type: 'select', direction: 1 }] };
    if (key.pageUp) return { actions: [{ type: 'scroll', delta: size.pageSize }] };
    if (key.pageDown) return { actions: [{ type: 'scroll', delta: -size.pageSize }] };
  }
  if (input === 'G') return { actions: [{ type: 'scrollToBottom' }] };
  if (state.selected !== ALL) {
    if (input === 'r') return { actions: [], control: { type: 'restart' } };
    if (input === 's') {
      const isTool = state.tools.includes(state.selected);
      const isRunning = ['waiting', 'starting', 'ready', 'stopping'].includes(
        state.statuses[state.selected]?.state ?? 'stopped'
      );
      // A tool asks for its arguments first, so they can change between runs.
      return {
        actions: [],
        control: isTool && !isRunning ? { type: 'editToolArgs' } : { type: 'start' },
      };
    }
    if (input === 'x') return { actions: [], control: { type: 'stop' } };
  }
  return { actions: [] };
};
