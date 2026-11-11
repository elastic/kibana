/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InkKey } from './ink_module';
import { getToggledValue, handleKey } from './tui_keys';
import {
  ALL,
  MAX_LINES,
  createTuiState,
  getMatchingLines,
  getMatchingSettings,
  getSelectedSetting,
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

const SIZE = { visibleRows: 10, pageSize: 10 };

const noKey: InkKey = {
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
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

  it('cycles the selected process through logs, current and available settings, and launch flags', () => {
    const state = onKibana();
    const panes = [1, 2, 3, 4].map(
      (count) => apply(state, ...Array(count).fill({ type: 'cyclePane' })).pane
    );
    expect(panes).toEqual(['current', 'available', 'flags', 'logs']);
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
    expect(handleKey(onKibana(), '', { ...noKey, tab: true }, SIZE).actions).toEqual([
      { type: 'cyclePane' },
    ]);
  });
});

describe('editing settings', () => {
  const list = {
    rows: [
      { key: 'a.flag', detail: 'boolean' },
      { key: 'b.port', value: '5602', source: 'config/kibana.dev.yml', detail: 'number' },
      { key: 'c.secret', value: '••••', source: 'config/kibana.dev.yml', detail: 'string' },
      { key: 'd.limit', detail: 'default true' },
    ],
    notes: [],
  };
  const onSettings = () =>
    apply(
      initial(),
      { type: 'select', direction: -1 },
      { type: 'cyclePane' },
      { type: 'cyclePane' },
      { type: 'settingsLoaded', processId: 'kibana', kind: 'available', list }
    );
  const keyPress = (state: TuiState, input: string, key: Partial<InkKey> = {}) =>
    handleKey(state, input, { ...noKey, ...key }, { visibleRows: 2, pageSize: 2 });
  const press = (state: TuiState, input: string, key: Partial<InkKey> = {}) =>
    apply(state, ...keyPress(state, input, key).actions);

  it('moves a cursor through the settings, scrolling to keep it visible', () => {
    const atLast = press(press(press(onSettings(), 'j'), '', { downArrow: true }), 'j');
    expect(getSelectedSetting(atLast)?.key).toBe('d.limit');
    expect(atLast.settingsScroll).toBe(2);
    expect(press(atLast, 'j').settingsCursor).toBe(3);
    const backUp = press(atLast, '', { pageUp: true });
    expect(backUp).toMatchObject({ settingsCursor: 1, settingsScroll: 1 });
  });

  it('switches process with left and right in every pane', () => {
    expect(press(onSettings(), '', { leftArrow: true }).selected).toBe('es');
    expect(press(onSettings(), 'l').selected).toBe(ALL);
  });

  it('toggles booleans with space, from their value or their default', () => {
    expect(getToggledValue({ key: 'x', value: 'true' })).toBe('false');
    expect(getToggledValue({ key: 'x', detail: 'default true' })).toBe('false');
    expect(getToggledValue({ key: 'x', detail: 'boolean' })).toBe('true');
    expect(getToggledValue({ key: 'x', value: '5602' })).toBeUndefined();

    expect(keyPress(onSettings(), ' ').control).toEqual({
      type: 'setSetting',
      row: list.rows[0],
      input: 'true',
    });
    const onPort = press(onSettings(), 'j');
    expect(press(onPort, ' ').notice).toEqual({
      text: 'b.port is not a boolean; press e to edit its value',
      isError: true,
    });
  });

  it('edits a value from what it is, and saves it on enter', () => {
    const onPort = press(onSettings(), 'j');
    const editing = press(onPort, 'e');
    expect(editing.valueEdit).toEqual({
      processId: 'kibana',
      target: { type: 'setting', row: list.rows[1] },
      label: 'b.port',
      text: '5602',
    });
    // Command keys are text while editing.
    const typed = press(press(press(editing, '', { backspace: true }), '3'), 'q');
    expect(typed.valueEdit?.text).toBe('5603q');
    const saved = keyPress(typed, '', { return: true });
    expect(saved.control).toEqual({ type: 'setSetting', row: list.rows[1], input: '5603q' });
    expect(apply(typed, ...saved.actions).valueEdit).toBeUndefined();
    expect(press(typed, '', { escape: true }).valueEdit).toBeUndefined();
  });

  it('does not put a masked secret into the editor', () => {
    const onSecret = press(press(onSettings(), 'j'), 'j');
    expect(press(onSecret, '', { return: true }).valueEdit?.text).toBe('');
  });

  it('unsets with u', () => {
    expect(keyPress(onSettings(), 'u').control).toEqual({
      type: 'unsetSetting',
      row: list.rows[0],
    });
  });

  it('marks a process for a restart until it starts again', () => {
    const changed = apply(onSettings(), {
      type: 'settingChanged',
      processId: 'es',
      message: 'restart es',
      needsRestart: true,
    });
    expect(changed).toMatchObject({
      pendingRestart: ['es'],
      settingsVersion: 1,
      notice: { text: 'restart es', isError: false },
    });
    const restarted = apply(changed, {
      type: 'status',
      status: status('es', { state: 'starting' }),
    });
    expect(restarted.pendingRestart).toEqual([]);
  });
});

describe('tools', () => {
  const withTool = () =>
    apply(createTuiState([status('es'), status('kibana'), status('synthtrace')], ['synthtrace']), {
      type: 'select',
      direction: -1,
    });
  const keyPress = (state: TuiState, input: string, key: Partial<InkKey> = {}) =>
    handleKey(state, input, { ...noKey, ...key }, SIZE);

  it('lists the processes in the order they start, then the tools alphabetically', () => {
    const state = createTuiState(
      ['es', 'kibana', 'synthtrace', 'connector-emulator', 'mcp'].map((id) => status(id)),
      ['synthtrace', 'connector-emulator', 'mcp']
    );
    expect(state.views).toEqual([ALL, 'es', 'kibana', 'connector-emulator', 'mcp', 'synthtrace']);
    expect(state.tools).toEqual(['connector-emulator', 'mcp', 'synthtrace']);
  });

  it('asks for the arguments of a stopped tool before starting it', () => {
    const state = withTool();
    expect(state.selected).toBe('synthtrace');
    expect(keyPress(state, 's').control).toEqual({ type: 'editToolArgs' });

    const editing = apply(state, {
      type: 'startValueEdit',
      target: { type: 'toolArgs' },
      label: 'synthtrace arguments',
      text: 'logs_and_metrics --live',
    });
    expect(keyPress(editing, '', { return: true }).control).toEqual({
      type: 'startTool',
      input: 'logs_and_metrics --live',
    });
  });

  it("shows a tool's --help in its own pane, but not in the combined output", () => {
    const state = apply(withTool(), {
      type: 'lines',
      lines: [
        { processId: 'synthtrace', stream: 'help', text: '--live  Generate continuously', time: 0 },
        { processId: 'es', stream: 'stdout', text: 'es started', time: 0 },
      ],
    });
    expect(getMatchingLines(state).map(({ text }) => text)).toEqual([
      '--live  Generate continuously',
    ]);
    const all = apply(state, { type: 'select', direction: 1 });
    expect(all.selected).toBe(ALL);
    expect(getMatchingLines(all).map(({ text }) => text)).toEqual(['es started']);
  });

  it('starts a running tool, or a process that is not a tool, without asking', () => {
    const running = apply(withTool(), {
      type: 'status',
      status: status('synthtrace', { state: 'ready' }),
    });
    expect(keyPress(running, 's').control).toEqual({ type: 'start' });
    const onKibana = apply(withTool(), { type: 'select', direction: -1 });
    expect(keyPress(onKibana, 's').control).toEqual({ type: 'start' });
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
    expect(handleKey(selectedEs, 'r', noKey, SIZE).control).toEqual({ type: 'restart' });
    expect(handleKey(selectedEs, 's', noKey, SIZE).control).toEqual({ type: 'start' });
    expect(handleKey(selectedEs, 'x', noKey, SIZE).control).toEqual({ type: 'stop' });
    expect(handleKey(initial(), 'r', noKey, SIZE).control).toBeUndefined();
  });

  it('quits on q and Ctrl+C, and ignores keys once quitting', () => {
    expect(handleKey(initial(), 'q', noKey, SIZE)).toEqual({
      actions: [{ type: 'quit' }],
      control: { type: 'quit' },
    });
    expect(handleKey(initial(), 'c', { ...noKey, ctrl: true }, SIZE).control).toEqual({
      type: 'quit',
    });
    const quitting = apply(initial(), { type: 'quit' });
    expect(handleKey(quitting, 'r', noKey, SIZE)).toEqual({ actions: [] });
  });

  it('types into the filter while editing it, so command keys become text', () => {
    const editing = apply(initial(), { type: 'editQuery' });
    expect(handleKey(editing, 'q', noKey, SIZE)).toEqual({
      actions: [{ type: 'queryInput', text: 'q' }],
    });
    expect(handleKey(editing, '', { ...noKey, return: true }, SIZE).actions).toEqual([
      { type: 'submitQuery' },
    ]);
    expect(handleKey(editing, '', { ...noKey, escape: true }, SIZE).actions).toEqual([
      { type: 'clearQuery' },
    ]);
  });

  it('scrolls by a page', () => {
    expect(handleKey(initial(), '', { ...noKey, pageUp: true }, SIZE).actions).toEqual([
      { type: 'scroll', delta: 10 },
    ]);
    expect(handleKey(initial(), '', { ...noKey, pageDown: true }, SIZE).actions).toEqual([
      { type: 'scroll', delta: -10 },
    ]);
  });
});
