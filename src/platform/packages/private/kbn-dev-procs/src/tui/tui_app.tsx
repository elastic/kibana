/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type {
  SettingRow,
  SettingsEditor,
  SettingsEditResult,
  SettingsKind,
} from '../settings/types';
import { toColoredDisplayText } from '../ansi';
import type { RepoInfo } from '../repo_info';
import type { ToolOptions } from '../types';
import type { Supervisor } from '../supervisor';
import type { LogLine, ProcessState } from '../types';
import type { InkModule } from './ink_module';
import { fitText, getColumnWidths } from './columns';
import type { ColumnWidths } from './columns';
import { handleKey } from './tui_keys';
import {
  ALL,
  createTuiState,
  getMatchingLines,
  getMatchingSettings,
  getSettingsEntry,
  getVisibleLines,
  getVisibleSettings,
  reduceTuiState,
  toDisplayText,
} from './tui_state';
import type { TuiState } from './tui_state';

export interface TuiAppProps {
  readonly supervisor: Supervisor;
  /** Called once the app listens to the supervisor, so that no state change or output is missed. */
  readonly onSubscribed: () => void;
  readonly onQuit: () => void;
  /** Reads the branch and commit shown in the top bar. */
  readonly readRepoInfo?: () => Promise<RepoInfo | undefined>;
}

const FLUSH_INTERVAL_MS = 100;
// Ink clears the whole terminal before every frame that is as tall as the terminal, which flashes on each
// update. One spare row keeps the frame shorter, so Ink rewrites it in place instead.
const SPARE_ROWS = 1;
// Rows that do not show output: the spare row, the top bar, two border rows, the pane title and the key hints.
const CHROME_ROWS = SPARE_ROWS + 5;
// How often the top bar re-reads the branch, which can change while the TUI runs.
const REPO_INFO_INTERVAL_MS = 5000;
// The lines under a tool's pane title: its description and arguments, and the command that starts it.
const TOOL_LINE_ROWS = 2;
// Plain Unicode, so they show without a patched font.
const BRANCH_SYMBOL = '⎇';
const COMMIT_SYMBOL = '◉';

const STATE_COLORS: Readonly<Record<ProcessState, string>> = {
  waiting: 'yellow',
  starting: 'yellow',
  ready: 'green',
  stopping: 'yellow',
  stopped: 'gray',
  exited: 'gray',
  failed: 'red',
};

const STATE_ICONS: Readonly<Record<ProcessState, string>> = {
  waiting: '◌',
  starting: '◌',
  ready: '●',
  stopping: '◌',
  stopped: '○',
  exited: '○',
  failed: '✖',
};

const MIN_SIDEBAR_WIDTH = 26;
// Around each row: the border and padding on both sides, the cursor and state icon, and the restart marker.
const SIDEBAR_CHROME_COLUMNS = 4 + 4 + 2;
const LONGEST_STATE = Math.max(...Object.keys(STATE_ICONS).map((state) => state.length));

/** Wide enough for every process with its longest state, e.g. "› ○ connector-emulator stopping ↻". */
export const getSidebarWidth = (views: readonly string[]): number =>
  Math.max(
    MIN_SIDEBAR_WIDTH,
    ...views.map((view) => view.length + 1 + LONGEST_STATE + SIDEBAR_CHROME_COLUMNS)
  );

const PROCESS_COLORS = ['cyan', 'magenta', 'blue', 'yellow', 'green'] as const;
// Inside the pane: two border columns and one padding column on each side.
const PANE_CHROME_COLUMNS = 4;
// The ● that marks set settings in the available list, and a space.
const MARKER_WIDTH = 2;
const COLUMN_GAP = '  ';
const PANE_TITLES: Readonly<Record<SettingsKind, string>> = {
  current: 'current settings',
  available: 'available settings',
  flags: 'launch flags',
};

/** How many settings fit in a settings pane of `height` rows, after its notes and the last notice. */
const getSettingsRows = (state: TuiState, height: number): number => {
  const entry = getSettingsEntry(state);
  const notes = entry?.status === 'ready' ? entry.list.notes.length : 0;
  return Math.max(height - notes - (state.notice ? 1 : 0), 1);
};

const displayPath = (file: string): string => {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith('..') ? file : relative;
};

/** Builds the TUI from the `ink` module, which scripts/dev.js loads natively because it is ESM-only. */
export const createTuiApp = ({
  Box,
  Text,
  useInput,
  useStdout,
}: InkModule): ComponentType<TuiAppProps> => {
  const useTerminalSize = () => {
    const { stdout } = useStdout();
    const [size, setSize] = useState({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
    useEffect(() => {
      const onResize = () => setSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
      stdout.on('resize', onResize);
      return () => {
        stdout.off('resize', onResize);
      };
    }, [stdout]);
    return size;
  };

  const colorFor = (views: readonly string[], id: string): string =>
    PROCESS_COLORS[Math.max(views.indexOf(id) - 1, 0) % PROCESS_COLORS.length];

  const Sidebar = ({ state }: { readonly state: TuiState }) => (
    <Box
      flexDirection="column"
      width={getSidebarWidth(state.views)}
      // Long lines in the pane would otherwise squeeze the sidebar.
      flexShrink={0}
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
    >
      <Text bold>processes</Text>
      {state.views.map((view) => {
        const isSelected = view === state.selected;
        const status = state.statuses[view];
        const isFirstTool = view === state.tools[0];
        return (
          <React.Fragment key={view}>
            {isFirstTool ? <Text bold>{'\n'}tools</Text> : null}
            <Text inverse={isSelected} wrap="truncate-end">
              {isSelected ? '›' : ' '}{' '}
              {status ? (
                <Text color={STATE_COLORS[status.state]}>{STATE_ICONS[status.state]}</Text>
              ) : (
                <Text> </Text>
              )}{' '}
              <Text bold={isSelected}>{view}</Text>
              {status ? <Text dimColor> {status.state}</Text> : null}
              {state.pendingRestart.includes(view) ? <Text color="yellow"> ↻</Text> : null}
            </Text>
          </React.Fragment>
        );
      })}
    </Box>
  );

  const LogPane = ({
    state,
    height,
    tool,
  }: {
    readonly state: TuiState;
    readonly height: number;
    readonly tool?: ToolOptions;
  }) => {
    const status = state.statuses[state.selected];
    const { notice } = state;
    const isRunning = status && ['waiting', 'starting', 'ready', 'stopping'].includes(status.state);
    const toolLine = tool
      ? `${tool.description} · args: ${tool.getArgs()}${isRunning ? '' : ' · press s to start'}`
      : undefined;
    const lineCount = Math.max(height - (tool ? TOOL_LINE_ROWS : 0) - (notice ? 1 : 0), 1);
    const matchCount = getMatchingLines(state).length;
    const title = [
      state.selected,
      status ? `${status.state}${status.pid ? ` · pid ${status.pid}` : ''}` : undefined,
      status?.error,
      status ? `log: ${displayPath(status.logFile)}` : undefined,
      state.query ? `filter "${state.query}": ${matchCount} lines` : undefined,
      state.scrollOffset > 0 ? `scrolled up ${state.scrollOffset}` : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    const labelWidth = Math.max(...state.views.map((view) => view.length));
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="round"
        borderColor={status ? STATE_COLORS[status.state] : 'gray'}
        paddingX={1}
        overflow="hidden"
      >
        <Text bold wrap="truncate-end">
          {title}
        </Text>
        {toolLine ? (
          <Text dimColor wrap="truncate-end">
            {toolLine}
          </Text>
        ) : null}
        {tool ? (
          // To start the tool from another terminal instead.
          <Text wrap="truncate-end">
            <Text color="cyan">$ </Text>
            {tool.getCommand()}
          </Text>
        ) : null}
        {notice ? (
          <Text color={notice.isError ? 'red' : 'green'} wrap="truncate-end">
            {notice.text}
          </Text>
        ) : null}
        {getVisibleLines(state, lineCount).map((line: LogLine, index) => (
          <Text key={index} wrap="truncate-end">
            {state.selected === ALL ? (
              <Text color={colorFor(state.views, line.processId)}>
                {line.processId.padEnd(labelWidth)}{' '}
              </Text>
            ) : null}
            {toColoredDisplayText(line.raw ?? line.text)}
          </Text>
        ))}
      </Box>
    );
  };

  const SettingLine = ({
    row: { key, value, source, detail },
    kind,
    widths,
    isCursor,
  }: {
    readonly row: SettingRow;
    readonly kind: SettingsKind;
    readonly widths: ColumnWidths;
    readonly isCursor: boolean;
  }) => {
    const isSet = value !== undefined;
    const rest =
      kind === 'current' ? source : [detail, source && `(${source})`].filter(Boolean).join(' ');
    return (
      <Text wrap="truncate-end" inverse={isCursor}>
        {kind !== 'current' ? <Text color="green">{isSet ? '● ' : '  '}</Text> : null}
        <Text bold={isSet && kind !== 'current'}>{fitText(key, widths.key, 'middle')}</Text>
        {widths.value > 0 ? (
          <Text color="cyan">
            {COLUMN_GAP}
            {fitText(toDisplayText(value ?? ''), widths.value, 'end')}
          </Text>
        ) : null}
        {rest ? (
          <Text dimColor>
            {COLUMN_GAP}
            {rest}
          </Text>
        ) : null}
      </Text>
    );
  };

  const SettingsPane = ({
    state,
    height,
    width,
    kind,
    hint,
  }: {
    readonly state: TuiState;
    readonly height: number;
    /** The columns available for settings, inside the pane's border and padding. */
    readonly width: number;
    readonly kind: SettingsKind;
    readonly hint?: string;
  }) => {
    const entry = getSettingsEntry(state);
    const total = entry?.status === 'ready' ? entry.list.rows.length : undefined;
    const matchCount = getMatchingSettings(state).length;
    const title = [
      state.selected,
      PANE_TITLES[kind],
      total === undefined
        ? undefined
        : state.query
        ? `filter "${state.query}": ${matchCount} of ${total}`
        : `${total}`,
    ]
      .filter(Boolean)
      .join(' · ');
    const notes = entry?.status === 'ready' ? entry.list.notes : [];
    const visible = getVisibleSettings(state, getSettingsRows(state, height));
    const { notice } = state;
    const needsRestart = state.pendingRestart.includes(state.selected);
    const widths = getColumnWidths(
      // From every matching setting, not only the visible ones, so the columns stay put while scrolling.
      getMatchingSettings(state),
      width - (kind !== 'current' ? MARKER_WIDTH : 0)
    );
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="round"
        borderColor="blue"
        paddingX={1}
        overflow="hidden"
      >
        <Text bold wrap="truncate-end">
          {title}
          {needsRestart ? (
            <Text color="yellow"> · ↻ press r to restart and apply changes</Text>
          ) : null}
        </Text>
        {notice ? (
          <Text color={notice.isError ? 'red' : 'green'} wrap="truncate-end">
            {notice.text}
          </Text>
        ) : null}
        {!entry || entry.status === 'loading' ? (
          <Text color="yellow" wrap="truncate-end">
            loading…{hint ? ` ${hint}` : ''}
          </Text>
        ) : null}
        {entry?.status === 'error' ? (
          <Text color="red" wrap="truncate-end">
            {entry.error}
          </Text>
        ) : null}
        {notes.map((note) => (
          <Text key={note} dimColor wrap="truncate-end">
            {note}
          </Text>
        ))}
        {visible.map((row, index) => (
          <SettingLine
            key={row.key}
            row={row}
            kind={kind}
            widths={widths}
            isCursor={state.settingsScroll + index === state.settingsCursor}
          />
        ))}
      </Box>
    );
  };

  const Header = ({ repoInfo }: { readonly repoInfo?: RepoInfo }) => (
    <Box justifyContent="space-between" paddingX={1}>
      <Text bold color="black" backgroundColor="cyan">
        {' esprocs '}
      </Text>
      {repoInfo ? (
        <Text wrap="truncate-end">
          <Text color="magenta">
            {BRANCH_SYMBOL} {repoInfo.branch ?? 'detached HEAD'}
          </Text>
          <Text dimColor>
            {'  '}
            {COMMIT_SYMBOL} {repoInfo.shortCommit}
          </Text>
        </Text>
      ) : null}
    </Box>
  );

  const Footer = ({ state }: { readonly state: TuiState }) => {
    if (state.isQuitting) {
      return <Text color="yellow">stopping every process…</Text>;
    }
    const { valueEdit } = state;
    if (valueEdit) {
      return (
        <Text wrap="truncate-end">
          <Text bold>{valueEdit.label}</Text>
          {valueEdit.target.type === 'setting' ? ' = ' : ': '}
          {valueEdit.text}
          <Text inverse> </Text>
          <Text dimColor>
            {valueEdit.target.type === 'setting' ? ' enter save' : ' enter start'} · esc cancel
          </Text>
        </Text>
      );
    }
    if (state.isEditingQuery) {
      return (
        <Text wrap="truncate-end">
          /{state.query}
          <Text inverse> </Text>
          <Text dimColor> enter keep filter · esc clear</Text>
        </Text>
      );
    }
    const processKeys =
      state.selected === ALL ? '' : ' · tab logs/settings · r restart · s start · x stop';
    const paneKeys =
      state.pane === 'logs'
        ? '↑↓/←→ select process · PgUp/PgDn scroll · G follow'
        : '↑↓ move · ←→ process · space toggle · e edit · u unset';
    return (
      <Text dimColor wrap="truncate-end">
        {paneKeys} · / filter{processKeys} · q quit
      </Text>
    );
  };

  const TuiApp = ({ supervisor, onSubscribed, onQuit, readRepoInfo }: TuiAppProps) => {
    const [repoInfo, setRepoInfo] = useState<RepoInfo | undefined>();
    useEffect(() => {
      if (!readRepoInfo) {
        return;
      }
      const read = () => void readRepoInfo().then(setRepoInfo);
      read();
      const timer = setInterval(read, REPO_INFO_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [readRepoInfo]);

    const [state, dispatch] = useReducer(reduceTuiState, supervisor, (initial) =>
      createTuiState(
        initial.getStatus().processes,
        initial
          .getStatus()
          .processes.map(({ id }) => id)
          .filter((id) => initial.getTool(id))
      )
    );
    const { rows, columns } = useTerminalSize();
    const logLines = Math.max(rows - CHROME_ROWS, 1);

    useEffect(() => {
      // Kibana logs in bursts; one render per batch keeps the TUI responsive.
      let pending: LogLine[] = [];
      const offLine = supervisor.onLine((line) => pending.push(line));
      const offChange = supervisor.onChange((status) => dispatch({ type: 'status', status }));
      const timer = setInterval(() => {
        if (pending.length > 0) {
          const lines = pending;
          pending = [];
          dispatch({ type: 'lines', lines });
        }
      }, FLUSH_INTERVAL_MS);
      onSubscribed();
      return () => {
        offLine();
        offChange();
        clearInterval(timer);
      };
    }, [supervisor, onSubscribed]);

    const { selected, pane, settingsVersion } = state;
    const selectedState = state.statuses[selected]?.state;
    const provider = selected === ALL ? undefined : supervisor.getSettingsProvider(selected);
    useEffect(() => {
      if (pane === 'logs' || selected === ALL) {
        return;
      }
      if (!provider) {
        dispatch({
          type: 'settingsFailed',
          processId: selected,
          kind: pane,
          error: 'This process does not report its settings.',
        });
        return;
      }
      // Reloads when the process changes state, e.g. once Elasticsearch is ready to answer, and after a change.
      dispatch({ type: 'settingsLoading', processId: selected, kind: pane });
      const load = pane === 'flags' ? provider.flags : provider[pane];
      if (!load) {
        dispatch({
          type: 'settingsFailed',
          processId: selected,
          kind: pane,
          error: 'This process has no launch flags to show.',
        });
        return;
      }
      load().then(
        (list) => dispatch({ type: 'settingsLoaded', processId: selected, kind: pane, list }),
        (error: Error) =>
          dispatch({
            type: 'settingsFailed',
            processId: selected,
            kind: pane,
            error: error.message,
          })
      );
    }, [provider, selected, pane, selectedState, settingsVersion]);

    // A tool's --help is shown in its pane, so its flags are at hand before starting it. Read once per tool.
    const helpRequested = useRef(new Set<string>());
    const selectedTool = selected === ALL ? undefined : supervisor.getTool(selected);
    // Read when the help arrives, which can be after the user moved on or resized.
    const current = useRef({ selected, logLines });
    current.current = { selected, logLines };
    useEffect(() => {
      if (!selectedTool || helpRequested.current.has(selected)) {
        return;
      }
      helpRequested.current.add(selected);
      const toLines = (texts: readonly string[]): LogLine[] =>
        texts.map((text) => ({ processId: selected, stream: 'help', text, time: Date.now() }));
      selectedTool.readHelp().then(
        (help) => {
          const lines = toLines([`── ${selectedTool.helpCommand} ──`, ...help, '']);
          dispatch({ type: 'lines', lines });
          // Help reads from the top, so show its start rather than follow its end like a log.
          if (current.current.selected === selected) {
            const visibleRows = current.current.logLines - TOOL_LINE_ROWS;
            dispatch({ type: 'scroll', delta: Math.max(lines.length - visibleRows, 0) });
          }
        },
        (error: Error) =>
          dispatch({
            type: 'lines',
            lines: toLines([`Could not read ${selectedTool.helpCommand}: ${error.message}`]),
          })
      );
    }, [selected, selectedTool]);

    const changeSetting = (change: (editor: SettingsEditor) => Promise<SettingsEditResult>) => {
      const editor = pane === 'flags' ? provider?.flagEditor : provider?.editor;
      if (!editor) {
        dispatch({
          type: 'notice',
          text: `${selected} settings cannot be changed here`,
          isError: true,
        });
        return;
      }
      change(editor).then(
        ({ message, needsRestart }) =>
          dispatch({ type: 'settingChanged', processId: selected, message, needsRestart }),
        (error: Error) => dispatch({ type: 'notice', text: error.message, isError: true })
      );
    };

    useInput((input, key) => {
      const visibleRows = pane === 'logs' ? logLines : getSettingsRows(state, logLines);
      const pageSize = pane === 'logs' ? Math.max(logLines - 1, 1) : visibleRows;
      const { actions, control } = handleKey(state, input, key, { visibleRows, pageSize });
      actions.forEach(dispatch);
      switch (control?.type) {
        case 'quit':
          onQuit();
          break;
        case 'restart':
          void supervisor.restart(selected);
          break;
        case 'start':
          void supervisor.start(selected);
          break;
        case 'stop':
          void supervisor.stop(selected);
          break;
        case 'setSetting':
          changeSetting((editor) => editor.set(control.row, control.input));
          break;
        case 'editToolArgs': {
          const tool = supervisor.getTool(selected);
          if (tool) {
            dispatch({
              type: 'startValueEdit',
              target: { type: 'toolArgs' },
              label: `${selected} arguments`,
              text: tool.getArgs(),
            });
          }
          break;
        }
        case 'startTool': {
          const tool = supervisor.getTool(selected);
          try {
            tool?.setArgs(control.input);
          } catch (error) {
            dispatch({ type: 'notice', text: error.message, isError: true });
            break;
          }
          // Follow the tool's output from here on, below its help.
          dispatch({ type: 'scrollToBottom' });
          void supervisor.start(selected);
          break;
        }
        case 'unsetSetting':
          changeSetting((editor) => editor.unset(control.row));
          break;
      }
    });

    return (
      <Box flexDirection="column" height={Math.max(rows - SPARE_ROWS, 1)}>
        <Header repoInfo={repoInfo} />
        <Box flexGrow={1}>
          <Sidebar state={state} />
          {pane === 'logs' ? (
            <LogPane
              state={state}
              height={logLines}
              tool={selected === ALL ? undefined : supervisor.getTool(selected)}
            />
          ) : (
            <SettingsPane
              state={state}
              height={logLines}
              width={Math.max(columns - getSidebarWidth(state.views) - PANE_CHROME_COLUMNS, 1)}
              kind={pane}
              hint={provider?.loadingHint?.[pane]}
            />
          )}
        </Box>
        <Footer state={state} />
      </Box>
    );
  };

  return TuiApp;
};
