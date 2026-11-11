/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripAnsi from 'strip-ansi';

const ESC = String.fromCharCode(27);
// Select Graphic Rendition: colours and styles, the only escape sequences that are safe inside the TUI.
const SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
const RESET = `${ESC}[0m`;
const TAB = '    ';

/** Expands tabs and drops control characters, which the terminal would draw at a different width than Ink measures. */
export const toDisplayText = (text: string): string =>
  Array.from(text, (char) => {
    if (char === '\t') return TAB;
    const code = char.charCodeAt(0);
    return code < 32 || code === 127 ? '' : char;
  }).join('');

/**
 * Like toDisplayText, but keeps the colours: other escape sequences, such as cursor movements, would break the TUI's
 * layout. Ends with a reset, so a colour does not run into what Ink draws after the line.
 */
export const toColoredDisplayText = (raw: string): string => {
  const colors = raw.match(SGR) ?? [];
  if (colors.length === 0) {
    return toDisplayText(stripAnsi(raw));
  }
  const texts = raw.split(SGR).map((part) => toDisplayText(stripAnsi(part)));
  return texts.map((text, index) => `${text}${colors[index] ?? ''}`).join('') + RESET;
};
