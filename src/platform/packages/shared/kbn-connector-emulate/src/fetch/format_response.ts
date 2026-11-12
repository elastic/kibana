/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall } from './create_emulator_fetch';

/** How many characters of a response body `formatResponse` shows by default. */
export const DEFAULT_LOGGED_RESPONSE_CHARS = 300;

/**
 * One line about what the emulator answered a call with: its status, where the answer came from
 * (a fixture, a recording, or `generated` from the spec) and the start of its body. Undefined when
 * the call carries no capture, which only the latest calls do, and only with `capture` on.
 */
export const formatResponse = (
  { status, responseSource, captured }: ContractCall,
  maxChars: number = DEFAULT_LOGGED_RESPONSE_CHARS
): string | undefined => {
  if (!captured) {
    return undefined;
  }
  const { body, bodyTruncated } = captured.response;
  const origin = responseSource ? ` [${responseSource}]` : '';
  if (body === undefined) {
    return `← ${status}${origin}`;
  }
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  // A body the capture cut is only part of the answer, however short the part is.
  const cut = bodyTruncated || text.length > maxChars;
  const shown = text.length > maxChars ? text.slice(0, maxChars) : text;
  return `← ${status}${origin} ${shown}${
    cut ? `… (${bodyTruncated ? 'more than ' : ''}${text.length} characters)` : ''
  }`;
};
