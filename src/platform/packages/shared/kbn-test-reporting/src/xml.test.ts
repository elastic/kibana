/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeCdata } from './xml';

describe('escapeCdata', () => {
  it('keeps valid XML characters, including surrogate pairs', () => {
    const input = 'tab\there\nline\r\nunicode é ✓ 😀 \uE000\uFFFD \u{10FFFF}';
    expect(escapeCdata(input)).toBe(input);
  });

  it('removes characters that are not allowed in XML', () => {
    expect(escapeCdata('a\u0000b\u0008c\u001Fd\uFFFEe\uFFFFf')).toBe('abcdef');
  });

  it('removes lone surrogates but keeps paired ones', () => {
    expect(escapeCdata('a\uD800b\uDC00c\uD83D\uDE00d')).toBe('abc\uD83D\uDE00d');
  });

  it('strips ANSI escape codes', () => {
    expect(escapeCdata('\u001b[31mred\u001b[39m text')).toBe('red text');
  });

  it('handles multi-MB input with astral characters without overflowing the stack', () => {
    const input = 'a'.repeat(10_000_000) + '😀' + '\u0000';
    const output = escapeCdata(input);
    expect(output).toHaveLength(input.length - 1);
    expect(output.endsWith('😀')).toBe(true);
  });
});
