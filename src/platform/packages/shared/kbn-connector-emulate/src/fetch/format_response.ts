/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall } from './create_emulator_fetch';

/** How many lines of a response body `formatResponse` shows by default. */
export const DEFAULT_LOGGED_RESPONSE_LINES = 30;

/** Longer lines, such as the markdown of a page, are cut to this many characters. */
const MAX_LINE_CHARS = 160;

const clip = (line: string): string =>
  line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}…` : line;

/**
 * What the emulator answered a call with, as lines to log: the status and where the answer came
 * from (a fixture, a recording, or `generated` from the spec), then the start of the body, JSON
 * indented. Undefined when the call carries no capture, which only the latest calls do, and only
 * with `capture` on.
 */
export const formatResponse = (
  { status, responseSource, captured }: ContractCall,
  maxLines: number = DEFAULT_LOGGED_RESPONSE_LINES
): string | undefined => {
  if (!captured) {
    return undefined;
  }
  const { body, bodyTruncated } = captured.response;
  const header = `← ${status}${responseSource ? ` [${responseSource}]` : ''}`;
  if (body === undefined) {
    return header;
  }
  const lines = (typeof body === 'string' ? body : JSON.stringify(body, null, 2)).split('\n');
  const hidden = lines.length - maxLines;
  return [
    header,
    ...lines.slice(0, maxLines).map((line) => `  ${clip(line)}`),
    ...(hidden > 0 ? [`  … ${hidden} more line${hidden === 1 ? '' : 's'}`] : []),
    // A body the capture cut is only part of the answer, however short the part is.
    ...(bodyTruncated ? ['  … the capture cut the rest of the body'] : []),
  ].join('\n');
};
