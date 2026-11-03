/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/** Where one command of a query spent its time. */
export interface EditorCommandHeatEntry {
  /** Offset of the first character of the command in `EditorCommandHeat.query`. */
  start: number;
  /** Offset just after the last character of the command. */
  end: number;
  /** Share of the operator CPU time, from 0 to 1. */
  share: number;
  /** True when time is shared with a similar command, so the share is an upper bound. */
  isApproximate: boolean;
  /** Operators matched to the command, slowest first. */
  operators: string[];
}

/** Where a query spent its time, command by command. It only describes the exact text it was measured on. */
export interface EditorCommandHeat {
  query: string;
  commands: EditorCommandHeatEntry[];
  /** A plain text description of the profile, used to ask an AI how to speed a command up. */
  profileContext?: string;
}

export type HeatLevel = 'hot' | 'warm' | 'cool';

const HOT_SHARE = 0.5;
const WARM_SHARE = 0.25;

export const heatLevel = (share: number): HeatLevel =>
  share >= HOT_SHARE ? 'hot' : share >= WARM_SHARE ? 'warm' : 'cool';

export const formatHeatShare = (share: number, isApproximate: boolean): string => {
  const percent = share * 100;
  const rounded = percent >= 10 || percent === 0 ? String(Math.round(percent)) : percent.toFixed(1);
  return `${isApproximate ? '~' : ''}${rounded}%`;
};

/**
 * Tells which commands of the heat apply to the text now in the editor. The heat is only true for
 * the text it was measured on, so an edited query gets nothing back. A change in the whitespace
 * around the query only moves the commands.
 */
export function matchHeatToText(
  heat: EditorCommandHeat,
  text: string
): EditorCommandHeatEntry[] | undefined {
  const measured = heat.query.trim();
  if (measured.length === 0) {
    return undefined;
  }
  if (heat.query === text) {
    return heat.commands;
  }

  const current = text.trim();
  if (measured !== current) {
    return undefined;
  }

  const shift = text.indexOf(current) - heat.query.indexOf(measured);
  return heat.commands.map((entry) => ({
    ...entry,
    start: entry.start + shift,
    end: entry.end + shift,
  }));
}

interface Range {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface HeatDecoration {
  range: Range;
  options: {
    isWholeLine?: boolean;
    linesDecorationsClassName?: string;
    linesDecorationsTooltip?: string;
    hoverMessage?: { value: string; isTrusted: boolean };
    after?: { content: string; inlineClassName: string };
  };
}

export const HEAT_STRIPE_CLASS = 'esqlHeatStripe';
export const HEAT_BADGE_CLASS = 'esqlHeatBadge';
export const SPEED_UP_COMMAND_ID = 'esql.speedUpCommand';

interface Position {
  lineNumber: number;
  column: number;
}

const MAX_COMMAND_LABEL_LENGTH = 70;

/** A command on one line, short enough for a hover, and safe inside a markdown code span. */
const describeCommand = (commandText: string): string => {
  const oneLine = commandText.replace(/\s+/g, ' ').replace(/`/g, "'").trim();
  return oneLine.length > MAX_COMMAND_LABEL_LENGTH
    ? `${oneLine.slice(0, MAX_COMMAND_LABEL_LENGTH)}…`
    : oneLine;
};

/**
 * Builds the decorations of every command that took time: a stripe in the gutter, a share at the
 * end of the command, and a hover with the operators and, when asked for, the action to speed it up.
 * Commands of a subquery can share a line, so each line gets one stripe, from its hottest command.
 */
export function buildHeatDecorations({
  entries,
  text,
  positionAt,
  getLineMaxColumn,
  speedUpCommandUri,
}: {
  entries: EditorCommandHeatEntry[];
  /** The text the offsets of the entries point into. */
  text: string;
  positionAt: (offset: number) => Position;
  getLineMaxColumn: (lineNumber: number) => number;
  /** Builds the link that runs the speed up action for a command. Left out when it is not offered. */
  speedUpCommandUri?: (commandIndex: number) => string;
}): HeatDecoration[] {
  const hottestByLine = new Map<number, EditorCommandHeatEntry>();
  const commandsByLine = new Map<number, number>();
  entries.forEach((entry) => {
    if (entry.share <= 0) {
      return;
    }
    const first = positionAt(entry.start).lineNumber;
    const last = positionAt(entry.end).lineNumber;
    for (let line = first; line <= last; line++) {
      commandsByLine.set(line, (commandsByLine.get(line) ?? 0) + 1);
      if (entry.share > (hottestByLine.get(line)?.share ?? 0)) {
        hottestByLine.set(line, entry);
      }
    }
  });

  const stripes: HeatDecoration[] = [...hottestByLine.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([lineNumber, entry]) => {
      const label = formatHeatShare(entry.share, entry.isApproximate);
      return {
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          linesDecorationsClassName: `${HEAT_STRIPE_CLASS} ${HEAT_STRIPE_CLASS}--${heatLevel(
            entry.share
          )}`,
          // This part of the gutter cannot show the rich hover, so a plain tooltip says what the
          // stripe is and, when it is offered, what a click does.
          linesDecorationsTooltip: speedUpCommandUri
            ? i18n.translate('esqlEditor.queryHeat.stripeTooltipWithAction', {
                defaultMessage:
                  '{share} of the operator CPU time. Click to suggest a faster version.',
                values: { share: label },
              })
            : i18n.translate('esqlEditor.queryHeat.stripeTooltip', {
                defaultMessage: '{share} of the operator CPU time',
                values: { share: label },
              }),
        },
      };
    });

  const perCommand = entries.flatMap((entry, index): HeatDecoration[] => {
    if (entry.share <= 0) {
      return [];
    }

    const start = positionAt(entry.start);
    const end = positionAt(entry.end);
    const level = heatLevel(entry.share);
    const label = formatHeatShare(entry.share, entry.isApproximate);
    const endColumn = Math.min(end.column, getLineMaxColumn(end.lineNumber));
    // Another command on one of its lines would open its own hover as well, with nothing to tell
    // the two apart, so such a command only gets a hover over its own text.
    const isAloneOnItsLines = ![...Array(end.lineNumber - start.lineNumber + 1).keys()].some(
      (offset) => (commandsByLine.get(start.lineNumber + offset) ?? 0) > 1
    );

    const hover = [
      i18n.translate('esqlEditor.queryHeat.hoverCommand', {
        defaultMessage: '`{command}`',
        values: { command: describeCommand(text.slice(entry.start, entry.end)) },
      }),
      i18n.translate('esqlEditor.queryHeat.hoverTitle', {
        defaultMessage: '**{share}** of the operator CPU time',
        values: { share: label },
      }),
      ...(entry.isApproximate
        ? [
            i18n.translate('esqlEditor.queryHeat.hoverApproximate', {
              defaultMessage:
                'Shared with a similar command, so this is an upper bound. The planner rewrites queries, so the match is approximate.',
            }),
          ]
        : []),
      ...(entry.operators.length > 0
        ? [
            i18n.translate('esqlEditor.queryHeat.hoverOperators', {
              defaultMessage: 'Operators: {operators}',
              values: { operators: entry.operators.map((name) => `\`${name}\``).join(', ') },
            }),
          ]
        : []),
      ...(speedUpCommandUri
        ? [
            `[${i18n.translate('esqlEditor.queryHeat.speedUpLink', {
              defaultMessage: 'Suggest a faster version',
            })}](${speedUpCommandUri(index)})`,
          ]
        : []),
    ].join('\n\n');

    return [
      {
        range: {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn,
        },
        // Whole lines, so the hover also opens over the share and the empty space after the command.
        options: {
          isWholeLine: isAloneOnItsLines,
          hoverMessage: { value: hover, isTrusted: true },
        },
      },
      {
        range: {
          startLineNumber: end.lineNumber,
          startColumn: endColumn,
          endLineNumber: end.lineNumber,
          endColumn,
        },
        options: {
          after: {
            content: ` ${label}`,
            inlineClassName: `${HEAT_BADGE_CLASS} ${HEAT_BADGE_CLASS}--${level}`,
          },
        },
      },
    ];
  });

  return [...stripes, ...perCommand];
}

/** Finds the hottest command with lines that include a line, so a click in the gutter can name it. */
export function findHeatCommandAtLine(
  entries: EditorCommandHeatEntry[],
  lineNumber: number,
  positionAt: (offset: number) => Position
): number | undefined {
  let found: number | undefined;
  entries.forEach((entry, index) => {
    if (
      entry.share > 0 &&
      lineNumber >= positionAt(entry.start).lineNumber &&
      lineNumber <= positionAt(entry.end).lineNumber &&
      (found === undefined || entry.share > entries[found].share)
    ) {
      found = index;
    }
  });
  return found;
}
