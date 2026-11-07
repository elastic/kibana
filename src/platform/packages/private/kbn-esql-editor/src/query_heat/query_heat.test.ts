/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildHeatDecorations,
  findHeatCommandAtLine,
  formatHeatShare,
  heatLevel,
  matchHeatToText,
} from './query_heat';
import type { EditorCommandHeat } from './query_heat';

const query = 'FROM logs\n| STATS c = COUNT(*)\n  BY a\n| SORT c DESC';

const heat: EditorCommandHeat = {
  query,
  commands: [
    { start: 0, end: 9, share: 0.6, isApproximate: false, operators: ['LuceneSource'] },
    { start: 12, end: 37, share: 0.3, isApproximate: true, operators: ['HashAggregation'] },
    { start: 40, end: 51, share: 0, isApproximate: false, operators: [] },
  ],
};

/** A stand-in for the editor model, turning offsets into lines and columns. */
const positionAt = (offset: number) => {
  const before = query.slice(0, offset);
  const lines = before.split('\n');
  return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
};
const getLineMaxColumn = (lineNumber: number) => query.split('\n')[lineNumber - 1].length + 1;

describe('heatLevel and formatHeatShare', () => {
  it('colors by share', () => {
    expect(heatLevel(0.7)).toBe('hot');
    expect(heatLevel(0.5)).toBe('hot');
    expect(heatLevel(0.3)).toBe('warm');
    expect(heatLevel(0.1)).toBe('cool');
  });

  it('formats a share, marking approximate ones', () => {
    expect(formatHeatShare(0.794, false)).toBe('79%');
    expect(formatHeatShare(0.21, true)).toBe('~21%');
    expect(formatHeatShare(0.054, false)).toBe('5.4%');
  });
});

describe('matchHeatToText', () => {
  it('applies to the text it was measured on', () => {
    expect(matchHeatToText(heat, query)).toBe(heat.commands);
  });

  it('moves the commands when only the whitespace around the query changed', () => {
    const matched = matchHeatToText(heat, `\n\n${query}  `);

    expect(matched?.[0]).toMatchObject({ start: 2, end: 11 });
    expect(matched?.[1]).toMatchObject({ start: 14, end: 39 });
  });

  it('gives nothing back once the query was edited, or when there is no query', () => {
    expect(matchHeatToText(heat, `${query} | LIMIT 1`)).toBeUndefined();
    expect(matchHeatToText({ ...heat, query: '  ' }, '  ')).toBeUndefined();
  });
});

describe('buildHeatDecorations', () => {
  const build = (speedUp = false) =>
    buildHeatDecorations({
      entries: heat.commands,
      text: query,
      positionAt,
      getLineMaxColumn,
      speedUpCommandUri: speedUp ? (index) => `command:speedUp?${index}` : undefined,
    });

  it('gives each command that took time a gutter stripe, a hover and a share at its end', () => {
    const decorations = build();

    // Three lines get a stripe, and the two commands that took time get a hover and a share each.
    // The idle command gets nothing. The stripes come first.
    expect(decorations).toHaveLength(7);
    const [stripe, , , hover, badge] = decorations;
    expect(stripe.range).toEqual({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    });
    expect(stripe.options).toEqual({
      isWholeLine: true,
      linesDecorationsClassName: 'esqlHeatStripe esqlHeatStripe--hot',
      linesDecorationsTooltip: '60% of the operator CPU time',
    });
    // The hover covers whole lines, so it opens over the share and the space after the command.
    expect(hover.options.isWholeLine).toBe(true);
    expect(hover.options.hoverMessage?.value).toContain('`FROM logs`');
    expect(hover.options.hoverMessage?.value).toContain('**60%** of the operator CPU time');
    expect(hover.options.hoverMessage?.value).toContain('`LuceneSource`');
    expect(badge.options.after).toEqual({
      content: ' 60%',
      inlineClassName: 'esqlHeatBadge esqlHeatBadge--hot',
    });
  });

  it('covers every line of a command that spans several lines, and ends the badge on the last', () => {
    const decorations = build();
    const [secondLine, thirdLine] = decorations.slice(1, 3);
    const badge = decorations[6];

    // A stripe on each line of the command, so it also reads as one block on a wrapped command.
    expect(secondLine.range).toMatchObject({ startLineNumber: 2, endLineNumber: 2 });
    expect(thirdLine.range).toMatchObject({ startLineNumber: 3, endLineNumber: 3 });
    expect(secondLine.options.linesDecorationsClassName).toContain('--warm');
    expect(thirdLine.options.linesDecorationsClassName).toContain('--warm');
    expect(badge.range).toMatchObject({ startLineNumber: 3, startColumn: 7, endColumn: 7 });
    expect(badge.options.after?.content).toBe(' ~30%');
  });

  it('tells in the gutter tooltip that a click suggests a faster version, when it does', () => {
    expect(build(true)[0].options.linesDecorationsTooltip).toBe(
      '60% of the operator CPU time. Click to suggest a faster version.'
    );
    expect(build(false)[0].options.linesDecorationsTooltip).toBe('60% of the operator CPU time');
  });

  it('explains approximate shares and links the speed up action only when it is offered', () => {
    const withoutAction = build()[5].options.hoverMessage?.value;
    const withAction = build(true)[5].options.hoverMessage?.value;

    expect(withoutAction).toContain('upper bound');
    expect(withoutAction).not.toContain('Suggest a faster version');
    expect(withAction).toContain('[Suggest a faster version](command:speedUp?1)');
    expect(build(true)[3].options.hoverMessage?.value).toContain('command:speedUp?0');
  });
});

describe('findHeatCommandAtLine', () => {
  it('names the command a line belongs to, and ignores commands that took no time', () => {
    expect(findHeatCommandAtLine(heat.commands, 1, positionAt)).toBe(0);
    expect(findHeatCommandAtLine(heat.commands, 2, positionAt)).toBe(1);
    expect(findHeatCommandAtLine(heat.commands, 3, positionAt)).toBe(1);
    expect(findHeatCommandAtLine(heat.commands, 4, positionAt)).toBeUndefined();
  });
});

describe('commands that share a line', () => {
  const line = 'FROM (FROM a | STATS c = COUNT(*)), (FROM b | STATS d = COUNT(*))';
  const positionOnOneLine = (offset: number) => ({ lineNumber: 1, column: offset + 1 });
  const entries = [
    { start: 6, end: 13, share: 0.7, isApproximate: false, operators: [] },
    { start: 16, end: 34, share: 0.2, isApproximate: true, operators: [] },
    { start: 38, end: 46, share: 0.05, isApproximate: false, operators: [] },
  ];

  it('gets one stripe, from the hottest command, and a share after each command', () => {
    const decorations = buildHeatDecorations({
      entries,
      text: line,
      positionAt: positionOnOneLine,
      getLineMaxColumn: () => line.length + 1,
    });

    const stripes = decorations.filter(
      (decoration) => decoration.options.linesDecorationsClassName
    );
    expect(stripes).toHaveLength(1);
    expect(stripes[0].options.linesDecorationsClassName).toContain('--hot');
    expect(stripes[0].options.linesDecorationsTooltip).toBe('70% of the operator CPU time');
    expect(decorations.filter((decoration) => decoration.options.after)).toHaveLength(3);
  });

  it('names the hottest command for a click on the line', () => {
    expect(findHeatCommandAtLine(entries, 1, positionOnOneLine)).toBe(0);
    expect(findHeatCommandAtLine(entries, 2, positionOnOneLine)).toBeUndefined();
  });
});

describe('hovers of commands that share a line', () => {
  const line = 'FROM (FROM a | STATS c = COUNT(*)), (FROM b | STATS d = COUNT(*))';
  const positionOnOneLine = (offset: number) => ({ lineNumber: 1, column: offset + 1 });
  const entries = [
    { start: 6, end: 12, share: 0.7, isApproximate: false, operators: ['LuceneSource'] },
    { start: 15, end: 33, share: 0.2, isApproximate: true, operators: ['HashAggregation'] },
  ];
  const decorations = buildHeatDecorations({
    entries,
    text: line,
    positionAt: positionOnOneLine,
    getLineMaxColumn: () => line.length + 1,
  });
  const hovers = decorations.filter((decoration) => decoration.options.hoverMessage);

  it('say which command they are about', () => {
    expect(hovers[0].options.hoverMessage?.value).toContain('`FROM a`');
    expect(hovers[1].options.hoverMessage?.value).toContain('`STATS c = COUNT(*)`');
  });

  it('only open over their own text, so they do not pile up on the whole line', () => {
    expect(hovers.map((decoration) => decoration.options.isWholeLine)).toEqual([false, false]);
    expect(hovers[0].range).toMatchObject({ startColumn: 7, endColumn: 13 });
    expect(hovers[1].range).toMatchObject({ startColumn: 16, endColumn: 34 });
  });

  it('keeps a long command short and the markdown intact', () => {
    const long = `FROM logs | EVAL \`odd\` = ${'x'.repeat(100)}`;
    const result = buildHeatDecorations({
      entries: [{ start: 12, end: long.length, share: 0.5, isApproximate: false, operators: [] }],
      text: long,
      positionAt: positionOnOneLine,
      getLineMaxColumn: () => long.length + 1,
    });

    const value = result.find((decoration) => decoration.options.hoverMessage)?.options.hoverMessage
      ?.value;
    expect(value).toContain("EVAL 'odd' =");
    expect(value).toContain('…`');
  });
});
