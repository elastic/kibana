/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  type ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows/types/latest';
import type { StepLogEntry, StepLogsApi, StepLogsConfig } from '@kbn/workflows-extensions/public';

const terminalContainerCss = css`
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
`;

// Standard 4-bit ANSI foreground → CSS hex
const ANSI_FG: Record<number, string> = {
  30: '#000000',
  31: '#cc0000',
  32: '#4e9a06',
  33: '#c4a000',
  34: '#3465a4',
  35: '#75507b',
  36: '#06989a',
  37: '#d3d7cf',
  90: '#555753',
  91: '#ef2929',
  92: '#8ae234',
  93: '#fce94f',
  94: '#729fcf',
  95: '#ad7fa8',
  96: '#34e2e2',
  97: '#eeeeec',
};

const ansi256ToHex = (n: number): string => {
  if (n < 16) return ANSI_FG[n < 8 ? n + 30 : n + 82] ?? '#ffffff';
  if (n < 232) {
    const i = n - 16;
    const toHex = (v: number) => (v === 0 ? 0 : 55 + 40 * v).toString(16).padStart(2, '0');
    return `#${toHex(Math.floor(i / 36))}${toHex(Math.floor((i % 36) / 6))}${toHex(i % 6)}`;
  }
  const v = (8 + (n - 232) * 10).toString(16).padStart(2, '0');
  return `#${v}${v}${v}`;
};

interface AnsiState {
  fg?: string;
  bg?: string;
  bold: boolean;
}

const applyExtendedColor = (
  codes: number[],
  i: number,
  isFg: boolean,
  state: AnsiState
): { state: AnsiState; advance: number } | null => {
  if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
    const color = ansi256ToHex(codes[i + 2]);
    return {
      state: isFg ? { ...state, fg: color } : { ...state, bg: color },
      advance: 3,
    };
  }
  if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
    const color = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`;
    return {
      state: isFg ? { ...state, fg: color } : { ...state, bg: color },
      advance: 5,
    };
  }
  return null;
};

const applyAnsiCode = (
  codes: number[],
  i: number,
  state: AnsiState,
  rawParam: string
): { state: AnsiState; advance: number } => {
  const c = codes[i];
  if (c === 0 || (rawParam === '' && codes.length === 1))
    return { state: { bold: false }, advance: 1 };
  if (c === 1) return { state: { ...state, bold: true }, advance: 1 };
  if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97))
    return { state: { ...state, fg: ANSI_FG[c] }, advance: 1 };
  if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107))
    return { state: { ...state, bg: ANSI_FG[c - 10] }, advance: 1 };
  if (c === 38 || c === 48) {
    const extended = applyExtendedColor(codes, i, c === 38, state);
    if (extended) return extended;
  }
  return { state, advance: 1 };
};

const ansiToSpans = (text: string): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  let state: AnsiState = { bold: false };
  let last = 0;
  let idx = 0;
  const re = /\x1b\[([0-9;]*)m/g;
  let m: RegExpExecArray | null;

  const flush = (end: number) => {
    if (end <= last) return;
    const chunk = text.slice(last, end);
    const style: React.CSSProperties = {};
    if (state.fg) style.color = state.fg;
    if (state.bg) style.backgroundColor = state.bg;
    if (state.bold) style.fontWeight = 'bold';
    result.push(
      <span key={idx++} style={style}>
        {chunk}
      </span>
    );
  };

  while ((m = re.exec(text)) !== null) {
    flush(m.index);
    last = m.index + m[0].length;
    const codes = m[1].split(';').map(Number);
    let i = 0;
    while (i < codes.length) {
      const { state: next, advance } = applyAnsiCode(codes, i, state, m[1]);
      state = next;
      i += advance;
    }
  }
  flush(text.length);
  return result;
};

const TerminalLogsView = memo<{ entries: StepLogEntry[] }>(({ entries }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={terminalContainerCss}>
      {entries.map((entry, i) => {
        const color =
          entry.level === 'error'
            ? euiTheme.colors.danger
            : entry.level === 'warn'
            ? euiTheme.colors.warning
            : euiTheme.colors.text;
        return (
          <div key={i} style={{ color }}>
            {ansiToSpans(entry.message)}
          </div>
        );
      })}
    </div>
  );
});
TerminalLogsView.displayName = 'TerminalLogsView';

interface StepLogsViewProps {
  stepExecution: WorkflowStepExecutionDto;
  config: StepLogsConfig;
  logsApi: StepLogsApi;
}

export const StepLogsView: React.FC<StepLogsViewProps> = ({ stepExecution, config, logsApi }) => {
  const [entries, setEntries] = useState<StepLogEntry[] | null>(null);

  // Refs so the poll loop always reads the latest values without restarting on every parent re-render.
  const stepExecutionRef = useRef(stepExecution);
  stepExecutionRef.current = stepExecution;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = (): Promise<StepLogEntry[]> => {
      const { getLogs } = configRef.current;
      return getLogs
        ? Promise.resolve(getLogs({ stepExecution: stepExecutionRef.current, logsApi }))
        : logsApi.fetchLogs().then((raw) =>
            raw.map((e) => ({
              message: e.message,
              timestamp: e.timestamp,
              level:
                e.level === 'info' || e.level === 'warn' || e.level === 'error'
                  ? e.level
                  : undefined,
            }))
          );
    };

    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await fetchOnce();
        if (!cancelled) setEntries(result);
      } catch {
        // keep previous entries on fetch error, keep polling
      }
      if (
        !cancelled &&
        !TerminalExecutionStatuses.includes(stepExecutionRef.current.status as ExecutionStatus)
      ) {
        setTimeout(poll, 500);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [logsApi]); // logsApi is memoized on stepExecution.id — restarts only when the step changes

  if (entries === null) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (entries.length === 0) {
    return (
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate('workflowsManagement.stepLogsView.emptyPlaceholder', {
            defaultMessage: 'No logs.',
          })}
        </p>
      </EuiText>
    );
  }

  return <TerminalLogsView entries={entries} />;
};
