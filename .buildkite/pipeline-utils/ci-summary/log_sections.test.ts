/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractFailingSection, stripAnsi, toPublicHeader } from './log_sections.ts';

const ESC = '\u001b';
const BEL = '\u0007';

describe('stripAnsi', () => {
  it('removes buildkite timestamps, CSI colors and OSC sequences', () => {
    const raw = `${ESC}_bk;t=1700000000000${BEL}${ESC}[31merror${ESC}[0m ${ESC}]8;;https://x${BEL}link${ESC}]8;;${BEL}`;
    expect(stripAnsi(raw)).toBe('error link');
  });
});

describe('extractFailingSection', () => {
  const log = [
    '~~~ Running commands',
    '--- Bootstrap',
    'ok',
    '--- Check Types',
    'src/a.ts(1,2): error TS2322: nope',
    '',
    '🚨 Error: The command exited with status 1',
    '~~~ Running global post-command hook',
    '--- Log out of gcloud',
    'done',
  ].join('\r\n');

  it('picks the last section opened before the command phase ended', () => {
    const section = extractFailingSection(log, 100);
    expect(section.header).toBe('--- Check Types');
    expect(section.tail).toEqual(['--- Check Types', 'src/a.ts(1,2): error TS2322: nope']);
    expect(section.truncated).toBe(false);
  });

  it('ignores post-command hook sections when no explicit error marker exists', () => {
    const noMarker = log.replace('🚨 Error: The command exited with status 1\r\n', '');
    expect(extractFailingSection(noMarker, 100).header).toBe('--- Check Types');
  });

  it('keeps the header plus the last N lines intact when the section is too long', () => {
    const long = ['--- Big', ...Array.from({ length: 50 }, (_, i) => `line ${i}`)].join('\n');
    const section = extractFailingSection(long, 5);
    expect(section.truncated).toBe(true);
    expect(section.tail).toEqual([
      '--- Big (truncated; showing last 5 lines)',
      'line 45',
      'line 46',
      'line 47',
      'line 48',
      'line 49',
    ]);
  });

  it('returns a null header and the whole log when there are no sections', () => {
    const section = extractFailingSection('a\nb\n', 10);
    expect(section.header).toBeNull();
    expect(section.tail).toEqual(['a', 'b']);
  });
});

describe('toPublicHeader', () => {
  it.each([
    ['--- Check Types', '--- Check Types'],
    [
      "+++ Run Failed Test Reporter (JUnit) #1, it's fine",
      "+++ Run Failed Test Reporter (JUnit) #1, it's fine",
    ],
    ['--- :yarn: bootstrap', '--- :yarn: bootstrap'],
    ['--- token=abc123?x=y', null],
    ['--- <script>', null],
    [null, null],
  ])('%s -> %s', (input, expected) => {
    expect(toPublicHeader(input)).toBe(expected);
  });
});
