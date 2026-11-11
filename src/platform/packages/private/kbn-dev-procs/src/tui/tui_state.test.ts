/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InkKey } from './ink_module';
import { handleKey } from './tui_keys';
import {
  ALL,
  MAX_LINES,
  createTuiState,
  getMatchingLines,
  getMatchingSettings,
  getSettingsEntry,
  getVisibleLines,
  getVisibleSettings,
  reduceTuiState,
  toDisplayText,
} from './tui_state';
import type { TuiAction, TuiState } from './tui_state';
import type { LogLine, ProcessStatus } from '../types';

const status = (id: string, rest: Partial<ProcessStatus> = {}): ProcessStatus => ({
  id,
  state: 'stopped',
  logFile: `/logs/${id}.log`,
  ...rest,
});

const line = (processId: string, text: string): LogLine => ({
  processId,
  stream: 'stdout',
  text,
  time: 0,
});

const apply = (state: TuiState, ...actions: readonly TuiAction[]): TuiState =>
  actions.reduce(reduceTuiState, state);

const initial = () =>
  apply(createTuiState([status('es'), status('kibana')]), {
    type: 'lines',
    lines: [
      line('es', 'es one'),
      line('kibana', 'kibana one'),
      line('es', 'es two'),
      line('kibana', 'Kibana is now available'),
    ],
  });

const noKey: InkKey = {
  upArrow: false,
  downArrow: false,
  pageUp: false,
  pageDown: false,
  return: false,
  tab: false,
  escape: false,
  ctrl: false,
  backspace: false,
  delete: false,
};

describe('TUI state', () => {
  it('lists all, then each process, and cycles through them', () => {
    const state = initial();
    expect(state.views).toEqual([ALL, 'es', 'kibana']);
    expect(apply(state, { type: 'select', direction: 1 }).selected).toBe('es');
    expect(apply(state, { type: 'select', direction: -1 }).selected).toBe('kibana');
    expect(apply(state, ...Array(3).fill({ type: 'select', direction: 1 })).selected).toBe(ALL);
  });

  it('shows the output of the selected process, narrowed by a case-insensitive filter', () => {
    const state = initial();
    const texts = (next: TuiState) => getMatchingLines(next).map(({ text }) => text);
    expect(texts(state)).toHaveLength(4);
    expect(texts(apply(state, { type: 'select', direction: 1 }))).toEqual(['es one', 'es two']);
    expect(
      texts(apply(state, { type: 'editQuery' }, { type: 'queryInput', text: 'KIBANA' }))
    ).toEqual(['kibana one', 'Kibana is now available']);
    expect(
      texts(
        apply(
          state,
          { type: 'queryInput', text: 'kibanaX' },
          { type: 'queryBackspace' },
          { type: 'clearQuery' }
        )
      )
    ).toHaveLength(4);
  });

  it('shows the newest lines that fit, and older ones when scrolled up', () => {
    const state = initial();
    const texts = (next: TuiState) => getVisibleLines(next, 2).map(({ text }) => text);
    expect(texts(state)).toEqual(['es two', 'Kibana is now available']);
    expect(texts(apply(state, { type: 'scroll', delta: 2 }))).toEqual(['es one', 'kibana one']);
    // Scrolling stops at the oldest line.
    expect(apply(state, { type: 'scroll', delta: 100 }).scrollOffset).toBe(3);
    expect(
      apply(state, { type: 'scroll', delta: 2 }, { type: 'scrollToBottom' }).scrollOffset
    ).toBe(0);
  });

  it('keeps the visible lines in place while scrolled up and new output arrives', () => {
    const scrolled = apply(initial(), { type: 'scroll', delta: 2 });
    const next = apply(scrolled, { type: 'lines', lines: [line('es', 'es three')] });
    expect(getVisibleLines(next, 2).map(({ text }) => text)).toEqual(['es one', 'kibana one']);
  });

  it('keeps only the newest lines in memory', () => {
    const lines = Array.from({ length: MAX_LINES + 5 }, (_, index) => line('es', `${index}`));
    const state = apply(createTuiState([status('es')]), { type: 'lines', lines });
    expect(state.lines).toHaveLength(MAX_LINES);
    expect(state.lines[0].text).toBe('5');
  });

  it('tracks the latest status of each process', () => {
    const state = apply(initial(), {
      type: 'status',
      status: status('es', { state: 'ready', pid: 1 }),
    });
    expect(state.statuses.es).toMatchObject({ state: 'ready', pid: 1 });
    expect(state.statuses.kibana.state).toBe('stopped');
  });
});

describe('settings panes', () => {
  const list = {
    rows: [
      { key: 'server.host', detail: 'string' },
      { key: 'server.port', value: '5602', source: 'config/kibana.dev.yml', detail: 'number' },
      { key: 'xpack.fleet.enabled', detail: 'boolean' },
    ],
    notes: ['note'],
  };
  const onKibana = () => apply(initial(), { type: 'select', direction: -1 });

  it('cycles the selected process through logs, current and available settings', () => {
    const state = onKibana();
    const panes = [1, 2, 3].map(
      (count) => apply(state, ...Array(count).fill({ type: 'cyclePane' })).pane
    );
    expect(panes).toEqual(['current', 'available', 'logs']);
    expect(apply(initial(), { type: 'cyclePane' }).pane).toBe('logs');
  });

  it('shows logs again for the combined view', () => {
    const state = apply(onKibana(), { type: 'cyclePane' }, { type: 'select', direction: 1 });
    expect(state).toMatchObject({ selected: ALL, pane: 'logs' });
  });

  it('keeps settings per process and kind, and the previous list while one reloads', () => {
    const loaded = apply(
      onKibana(),
      { type: 'cyclePane' },
      { type: 'cyclePane' },
      { type: 'settingsLoading', processId: 'kibana', kind: 'available' },
      { type: 'settingsLoaded', processId: 'kibana', kind: 'available', list }
    );
    expect(getSettingsEntry(loaded)).toEqual({ status: 'ready', list });
    const reloading = apply(loaded, {
      type: 'settingsLoading',
      processId: 'kibana',
      kind: 'available',
    });
    expect(getSettingsEntry(reloading)).toEqual({ status: 'ready', list });
    const failed = apply(reloading, {
      type: 'settingsFailed',
      processId: 'kibana',
      kind: 'available',
      error: 'boom',
    });
    expect(getSettingsEntry(failed)).toEqual({ status: 'error', error: 'boom' });
    expect(getSettingsEntry(apply(failed, { type: 'cyclePane' }))).toBeUndefined();
  });

  it('filters settings by key, value or detail and scrolls from the top', () => {
    const state = apply(
      onKibana(),
      { type: 'cyclePane' },
      { type: 'cyclePane' },
      { type: 'settingsLoaded', processId: 'kibana', kind: 'available', list }
    );
    const keys = (next: TuiState, height = 10) =>
      getVisibleSettings(next, height).map(({ key }) => key);
    expect(keys(apply(state, { type: 'queryInput', text: 'BOOL' }))).toEqual([
      'xpack.fleet.enabled',
    ]);
    expect(keys(apply(state, { type: 'queryInput', text: '5602' }))).toEqual(['server.port']);
    expect(getMatchingSettings(apply(state, { type: 'queryInput', text: 'server' }))).toHaveLength(
      2
    );
    expect(keys(apply(state, { type: 'scroll', delta: -1 }), 1)).toEqual(['server.port']);
    expect(apply(state, { type: 'scroll', delta: -100 }).settingsScroll).toBe(2);
    expect(
      apply(state, { type: 'scroll', delta: -1 }, { type: 'scroll', delta: 5 }).settingsScroll
    ).toBe(0);
  });

  it('switches panes with tab', () => {
    expect(handleKey(onKibana(), '', { ...noKey, tab: true }, 10).actions).toEqual([
      { type: 'cyclePane' },
    ]);
  });
});

describe('toDisplayText', () => {
  it('expands tabs and drops control characters so lines are as wide as Ink measures them', () => {
    expect(toDisplayText('\tat org.elasticsearch.Node.start\r')).toBe(
      '    at org.elasticsearch.Node.start'
    );
    expect(toDisplayText('bell\u0007 and delete\u007f')).toBe('bell and delete');
  });
});

describe('handleKey', () => {
  it('controls the selected process, but not the combined view', () => {
    const selectedEs = apply(initial(), { type: 'select', direction: 1 });
    expect(handleKey(selectedEs, 'r', noKey, 10).control).toBe('restart');
    expect(handleKey(selectedEs, 's', noKey, 10).control).toBe('start');
    expect(handleKey(selectedEs, 'x', noKey, 10).control).toBe('stop');
    expect(handleKey(initial(), 'r', noKey, 10).control).toBeUndefined();
  });

  it('quits on q and Ctrl+C, and ignores keys once quitting', () => {
    expect(handleKey(initial(), 'q', noKey, 10)).toEqual({
      actions: [{ type: 'quit' }],
      control: 'quit',
    });
    expect(handleKey(initial(), 'c', { ...noKey, ctrl: true }, 10).control).toBe('quit');
    const quitting = apply(initial(), { type: 'quit' });
    expect(handleKey(quitting, 'r', noKey, 10)).toEqual({ actions: [] });
  });

  it('types into the filter while editing it, so command keys become text', () => {
    const editing = apply(initial(), { type: 'editQuery' });
    expect(handleKey(editing, 'q', noKey, 10)).toEqual({
      actions: [{ type: 'queryInput', text: 'q' }],
    });
    expect(handleKey(editing, '', { ...noKey, return: true }, 10).actions).toEqual([
      { type: 'submitQuery' },
    ]);
    expect(handleKey(editing, '', { ...noKey, escape: true }, 10).actions).toEqual([
      { type: 'clearQuery' },
    ]);
  });

  it('scrolls by a page', () => {
    expect(handleKey(initial(), '', { ...noKey, pageUp: true }, 10).actions).toEqual([
      { type: 'scroll', delta: 10 },
    ]);
    expect(handleKey(initial(), '', { ...noKey, pageDown: true }, 10).actions).toEqual([
      { type: 'scroll', delta: -10 },
    ]);
  });
});
