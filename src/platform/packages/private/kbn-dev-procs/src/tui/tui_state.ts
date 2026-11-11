/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SettingRow, SettingsKind, SettingsList } from '../settings/types';
import type { LogLine, ProcessStatus } from '../types';

/** The pseudo-process that shows the output of every process. */
export const ALL = 'all';

/** Lines kept in memory for the panes; the log files keep everything. */
export const MAX_LINES = 20_000;

/** What the pane shows for the selected process. */
export type Pane = 'logs' | SettingsKind;
const PANES: readonly Pane[] = ['logs', 'current', 'available'];

export type SettingsEntry =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly list: SettingsList }
  | { readonly status: 'error'; readonly error: string };

export const settingsKey = (processId: string, kind: SettingsKind): string =>
  `${processId}:${kind}`;

export interface TuiState {
  readonly views: readonly string[];
  readonly selected: string;
  readonly statuses: Readonly<Record<string, ProcessStatus>>;
  readonly lines: readonly LogLine[];
  /** How many matching lines the pane is scrolled up from the newest one; 0 follows new output. */
  readonly scrollOffset: number;
  readonly query: string;
  readonly isEditingQuery: boolean;
  readonly isQuitting: boolean;
  readonly pane: Pane;
  readonly settings: Readonly<Record<string, SettingsEntry>>;
  /** How many matching settings the pane is scrolled down from the first one. */
  readonly settingsScroll: number;
}

export type TuiAction =
  | { readonly type: 'status'; readonly status: ProcessStatus }
  | { readonly type: 'lines'; readonly lines: readonly LogLine[] }
  | { readonly type: 'select'; readonly direction: 1 | -1 }
  | { readonly type: 'scroll'; readonly delta: number }
  | { readonly type: 'scrollToBottom' }
  | { readonly type: 'editQuery' }
  | { readonly type: 'queryInput'; readonly text: string }
  | { readonly type: 'queryBackspace' }
  | { readonly type: 'submitQuery' }
  | { readonly type: 'clearQuery' }
  | { readonly type: 'quit' }
  | { readonly type: 'cyclePane' }
  | { readonly type: 'settingsLoading'; readonly processId: string; readonly kind: SettingsKind }
  | {
      readonly type: 'settingsLoaded';
      readonly processId: string;
      readonly kind: SettingsKind;
      readonly list: SettingsList;
    }
  | {
      readonly type: 'settingsFailed';
      readonly processId: string;
      readonly kind: SettingsKind;
      readonly error: string;
    };

export const createTuiState = (statuses: readonly ProcessStatus[]): TuiState => ({
  views: [ALL, ...statuses.map(({ id }) => id)],
  selected: ALL,
  statuses: Object.fromEntries(statuses.map((status) => [status.id, status])),
  lines: [],
  scrollOffset: 0,
  query: '',
  isEditingQuery: false,
  isQuitting: false,
  pane: 'logs',
  settings: {},
  settingsScroll: 0,
});

const TAB = '    ';

/** Expands tabs and drops other control characters, which the terminal would draw at a different width than Ink measures. */
export const toDisplayText = (text: string): string =>
  Array.from(text, (char) => {
    if (char === '\t') return TAB;
    const code = char.charCodeAt(0);
    return code < 32 || code === 127 ? '' : char;
  }).join('');

/** The lines the pane would show if it were unlimited in height: the selected process, narrowed by the query. */
export const getMatchingLines = ({ lines, selected, query }: TuiState): readonly LogLine[] => {
  const needle = query.toLowerCase();
  return lines.filter(
    ({ processId, text }) =>
      (selected === ALL || processId === selected) &&
      (needle === '' || text.toLowerCase().includes(needle))
  );
};

/** The `height` lines that fit in the pane at the current scroll position, oldest first. */
export const getVisibleLines = (state: TuiState, height: number): readonly LogLine[] => {
  const matching = getMatchingLines(state);
  const end = Math.max(matching.length - state.scrollOffset, 0);
  return matching.slice(Math.max(end - height, 0), end);
};

export const getSettingsEntry = ({
  pane,
  selected,
  settings,
}: TuiState): SettingsEntry | undefined =>
  pane === 'logs' ? undefined : settings[settingsKey(selected, pane)];

/** The settings the pane would show if it were unlimited in height, narrowed by the query. */
export const getMatchingSettings = (state: TuiState): readonly SettingRow[] => {
  const entry = getSettingsEntry(state);
  if (entry?.status !== 'ready') {
    return [];
  }
  const needle = state.query.toLowerCase();
  return entry.list.rows.filter(({ key, value, detail }) =>
    [key, value, detail].some((text) => text?.toLowerCase().includes(needle))
  );
};

/** The `height` settings that fit in the pane at the current scroll position. */
export const getVisibleSettings = (state: TuiState, height: number): readonly SettingRow[] =>
  getMatchingSettings(state).slice(state.settingsScroll, state.settingsScroll + height);

const clampSettingsScroll = (state: TuiState, settingsScroll: number): number =>
  Math.min(Math.max(settingsScroll, 0), Math.max(getMatchingSettings(state).length - 1, 0));

const clampScroll = (state: TuiState, scrollOffset: number): number =>
  Math.min(Math.max(scrollOffset, 0), Math.max(getMatchingLines(state).length - 1, 0));

export const reduceTuiState = (state: TuiState, action: TuiAction): TuiState => {
  switch (action.type) {
    case 'status':
      return { ...state, statuses: { ...state.statuses, [action.status.id]: action.status } };
    case 'lines': {
      const combined = [...state.lines, ...action.lines];
      const lines = combined.length > MAX_LINES ? combined.slice(-MAX_LINES) : combined;
      if (state.scrollOffset === 0) {
        return { ...state, lines };
      }
      // Keep the lines on screen in place while the user reads back through the output.
      const next = { ...state, lines };
      const added = getMatchingLines(next).length - getMatchingLines(state).length;
      return { ...next, scrollOffset: clampScroll(next, state.scrollOffset + Math.max(added, 0)) };
    }
    case 'select': {
      const index = state.views.indexOf(state.selected);
      const nextIndex = (index + action.direction + state.views.length) % state.views.length;
      const selected = state.views[nextIndex];
      // The combined view only has logs.
      const pane = selected === ALL ? 'logs' : state.pane;
      return { ...state, selected, pane, scrollOffset: 0, settingsScroll: 0 };
    }
    case 'scroll':
      return state.pane === 'logs'
        ? { ...state, scrollOffset: clampScroll(state, state.scrollOffset + action.delta) }
        : // Settings read from the top, so scrolling up moves towards the first one.
          {
            ...state,
            settingsScroll: clampSettingsScroll(state, state.settingsScroll - action.delta),
          };
    case 'scrollToBottom':
      return { ...state, scrollOffset: 0, settingsScroll: 0 };
    case 'cyclePane': {
      if (state.selected === ALL) {
        return state;
      }
      const pane = PANES[(PANES.indexOf(state.pane) + 1) % PANES.length];
      return { ...state, pane, settingsScroll: 0 };
    }
    case 'settingsLoading':
    case 'settingsLoaded':
    case 'settingsFailed': {
      const key = settingsKey(action.processId, action.kind);
      const previous = state.settings[key];
      const entry: SettingsEntry =
        action.type === 'settingsLoaded'
          ? { status: 'ready', list: action.list }
          : action.type === 'settingsFailed'
          ? { status: 'error', error: action.error }
          : // Keep showing the previous list while it reloads.
            previous ?? { status: 'loading' };
      const next = { ...state, settings: { ...state.settings, [key]: entry } };
      return { ...next, settingsScroll: clampSettingsScroll(next, next.settingsScroll) };
    }
    case 'editQuery':
      return { ...state, isEditingQuery: true };
    case 'queryInput':
      return { ...state, query: state.query + action.text, scrollOffset: 0, settingsScroll: 0 };
    case 'queryBackspace':
      return { ...state, query: state.query.slice(0, -1), scrollOffset: 0, settingsScroll: 0 };
    case 'submitQuery':
      return { ...state, isEditingQuery: false };
    case 'clearQuery':
      return { ...state, query: '', isEditingQuery: false, scrollOffset: 0, settingsScroll: 0 };
    case 'quit':
      return { ...state, isQuitting: true, isEditingQuery: false };
  }
};
