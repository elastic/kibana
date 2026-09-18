/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface FailingSection {
  /** Header line as emitted, e.g. `--- Check Types`; null when the log has no section headers. */
  header: string | null;
  /** Lines from the header (inclusive) to the end of the command phase, tail-truncated. */
  tail: string[];
  truncated: boolean;
}

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
// Buildkite timestamp markers (`ESC _ bk;t=<ms> BEL`), then CSI / OSC escapes.
const BK_TIMESTAMP_RE = new RegExp(`${ESC}_bk;t=\\d+${BEL}`, 'g');
const ANSI_RE = new RegExp(
  `${ESC}\\[[0-9;?]*[ -/]*[@-~]|${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)`,
  'g'
);

const SECTION_HEADER_RE = /^(---|\+\+\+|~~~) /;
// Header content that is safe to publish verbatim; anything else is dropped.
const PUBLIC_HEADER_RE = /^(---|\+\+\+|~~~) [\w .:/()#,'-]+$/;

// Everything from here on is Buildkite hook output, not the failing command.
const COMMAND_PHASE_END_RE =
  /^(?:(?:~~~|---|\+\+\+) Running (?:global |local |plugin )?post-command hook|🚨 Error: The command exited with status)/;

export const stripAnsi = (text: string): string =>
  text.replace(BK_TIMESTAMP_RE, '').replace(ANSI_RE, '');

export const splitLogLines = (log: string): string[] => stripAnsi(log).split(/\r?\n/);

/**
 * Locates the section that was open when the command exited and returns its tail.
 * Hook output after the command phase is excluded so the tail ends at the real failure.
 */
export const extractFailingSection = (log: string, maxLines: number): FailingSection => {
  const lines = splitLogLines(log);

  let commandEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (COMMAND_PHASE_END_RE.test(lines[i])) {
      commandEnd = i;
      break;
    }
  }

  let headerIndex = -1;
  for (let i = commandEnd - 1; i >= 0; i--) {
    if (SECTION_HEADER_RE.test(lines[i])) {
      headerIndex = i;
      break;
    }
  }

  const start = headerIndex === -1 ? 0 : headerIndex;
  const section = lines.slice(start, commandEnd);
  while (section.length > 0 && section[section.length - 1].trim() === '') {
    section.pop();
  }

  const truncated = section.length > maxLines;
  const tail = truncated ? section.slice(section.length - maxLines) : section;
  if (truncated && headerIndex !== -1) {
    tail.unshift(`${lines[headerIndex]} (truncated; showing last ${maxLines} lines)`);
  }

  return {
    header: headerIndex === -1 ? null : lines[headerIndex].trim(),
    tail,
    truncated,
  };
};

/** Returns the header when it only contains allow-listed characters; otherwise null. */
export const toPublicHeader = (header: string | null): string | null =>
  header !== null && PUBLIC_HEADER_RE.test(header) ? header : null;
