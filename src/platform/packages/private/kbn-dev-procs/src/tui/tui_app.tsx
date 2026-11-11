/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import React, { useEffect, useReducer, useState } from 'react';
import type { ComponentType } from 'react';
import type { SettingRow, SettingsKind } from '../settings/types';
import type { Supervisor } from '../supervisor';
import type { LogLine, ProcessState } from '../types';
import type { InkModule } from './ink_module';
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
}

const FLUSH_INTERVAL_MS = 100;
const SIDEBAR_WIDTH = 26;
// Ink clears the whole terminal before every frame that is as tall as the terminal, which flashes on each
// update. One spare row keeps the frame shorter, so Ink rewrites it in place instead.
const SPARE_ROWS = 1;
// Rows that do not show output: the spare row, two border rows, the pane title and the key hints.
const CHROME_ROWS = SPARE_ROWS + 4;

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

const PROCESS_COLORS = ['cyan', 'magenta', 'blue', 'yellow', 'green'] as const;
const MAX_KEY_WIDTH = 56;
const PANE_TITLES: Readonly<Record<SettingsKind, string>> = {
  current: 'current settings',
  available: 'available settings',
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
      width={SIDEBAR_WIDTH}
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
        return (
          <Text key={view} inverse={isSelected} wrap="truncate-end">
            {isSelected ? '›' : ' '}{' '}
            {status ? (
              <Text color={STATE_COLORS[status.state]}>{STATE_ICONS[status.state]}</Text>
            ) : (
              <Text> </Text>
            )}{' '}
            <Text bold={isSelected}>{view}</Text>
            {status ? <Text dimColor> {status.state}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );

  const LogPane = ({ state, height }: { readonly state: TuiState; readonly height: number }) => {
    const status = state.statuses[state.selected];
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
        {getVisibleLines(state, height).map((line: LogLine, index) => (
          <Text key={index} wrap="truncate-end">
            {state.selected === ALL ? (
              <Text color={colorFor(state.views, line.processId)}>
                {line.processId.padEnd(labelWidth)}{' '}
              </Text>
            ) : null}
            {toDisplayText(line.text)}
          </Text>
        ))}
      </Box>
    );
  };

  const SettingLine = ({
    row: { key, value, source, detail },
    kind,
    keyWidth,
  }: {
    readonly row: SettingRow;
    readonly kind: SettingsKind;
    readonly keyWidth: number;
  }) => {
    const isSet = value !== undefined;
    return (
      <Text wrap="truncate-end">
        {kind === 'available' ? <Text color="green">{isSet ? '● ' : '  '}</Text> : null}
        <Text bold={isSet && kind === 'available'}>{key.padEnd(keyWidth)}</Text>
        {isSet ? <Text color="cyan"> {toDisplayText(value)}</Text> : null}
        {source ? <Text dimColor>{kind === 'current' ? ` ${source}` : ` (${source})`}</Text> : null}
        {kind === 'available' && detail ? <Text dimColor> · {detail}</Text> : null}
      </Text>
    );
  };

  const SettingsPane = ({
    state,
    height,
    kind,
    hint,
  }: {
    readonly state: TuiState;
    readonly height: number;
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
    const visible = getVisibleSettings(state, Math.max(height - notes.length, 1));
    const keyWidth = Math.min(Math.max(0, ...visible.map(({ key }) => key.length)), MAX_KEY_WIDTH);
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
        </Text>
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
        {visible.map((row) => (
          <SettingLine key={row.key} row={row} kind={kind} keyWidth={keyWidth} />
        ))}
      </Box>
    );
  };

  const Footer = ({ state }: { readonly state: TuiState }) => {
    if (state.isQuitting) {
      return <Text color="yellow">stopping every process…</Text>;
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
    const scrollKeys =
      state.pane === 'logs' ? 'PgUp/PgDn scroll · G follow' : 'PgUp/PgDn scroll · G top';
    return (
      <Text dimColor wrap="truncate-end">
        ↑↓ select · / filter · esc clear filter · {scrollKeys}
        {processKeys} · q quit
      </Text>
    );
  };

  const TuiApp = ({ supervisor, onSubscribed, onQuit }: TuiAppProps) => {
    const [state, dispatch] = useReducer(reduceTuiState, supervisor, (initial) =>
      createTuiState(initial.getStatus().processes)
    );
    const { rows } = useTerminalSize();
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

    const { selected, pane } = state;
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
      // Reloads when the process changes state, e.g. once Elasticsearch is ready to answer.
      dispatch({ type: 'settingsLoading', processId: selected, kind: pane });
      provider[pane]().then(
        (list) => dispatch({ type: 'settingsLoaded', processId: selected, kind: pane, list }),
        (error: Error) =>
          dispatch({
            type: 'settingsFailed',
            processId: selected,
            kind: pane,
            error: error.message,
          })
      );
    }, [provider, selected, pane, selectedState]);

    useInput((input, key) => {
      const { actions, control } = handleKey(state, input, key, Math.max(logLines - 1, 1));
      actions.forEach(dispatch);
      if (control === 'quit') {
        onQuit();
      } else if (control === 'restart') {
        void supervisor.restart(state.selected);
      } else if (control === 'start') {
        void supervisor.start(state.selected);
      } else if (control === 'stop') {
        void supervisor.stop(state.selected);
      }
    });

    return (
      <Box flexDirection="column" height={Math.max(rows - SPARE_ROWS, 1)}>
        <Box flexGrow={1}>
          <Sidebar state={state} />
          {pane === 'logs' ? (
            <LogPane state={state} height={logLines} />
          ) : (
            <SettingsPane
              state={state}
              height={logLines}
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
