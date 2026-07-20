/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parser corpus — the catalogue of inputs `textToTimeRange` supports.
 *
 * This is a CHARACTERIZATION suite: it pins the parser's current (English)
 * behaviour with explicit rows so that the upcoming grammar unification and
 * localization work can refactor underneath it while staying green. It also
 * doubles as human-readable documentation of "what can I type into the input".
 *
 * Determinism rules (so rows never flake across machines / timezones):
 * - Assert the datemath/ISO `start` / `end` strings, `type`, the boolean flags
 *   and the structured offsets — never the resolved `Date`s for relative/now
 *   inputs, which depend on the current instant.
 * - For absolute inputs, express the expected ISO as `new Date(y, m, d, …)
 *   .toISOString()` so the expectation is built in the same local timezone the
 *   parser uses, making it timezone-independent.
 */

import moment from 'moment';

import {
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_NOW,
  DATE_TYPE_RELATIVE,
  DEFAULT_DATE_FORMAT,
  MODIFICATION_DECREASE,
  MODIFICATION_INCREASE,
} from '../constants';
import type {
  DateOffset,
  DateType,
  ModificationAction,
  TimeRange,
  TimeRangeTransformOptions,
} from '../types';
import { textToTimeRange } from './parse_text';
import { prettifyValue, type PrettifyValueOptions } from './prettify_value';
import { parseDisplayParts, parseInputParts, type RangePart } from './parse_range_parts';
import { applyPartModification } from './modify_range_parts';

/** The deterministic subset of a parsed `TimeRange` a corpus row may assert. */
type CheckedFields = Pick<
  TimeRange,
  'start' | 'end' | 'type' | 'isNaturalLanguage' | 'isInvalid' | 'startOffset' | 'endOffset'
>;

interface CorpusRow {
  /** What the user types into the input. */
  input: string;
  /** Options passed to the parser (presets, delimiter, roundRelativeTime, dateFormat). */
  options?: TimeRangeTransformOptions;
  /** Why this row exists / what behaviour it documents. */
  note: string;
  /** Expected values — only the listed fields are asserted. */
  expected: Partial<CheckedFields>;
}

const offset = (
  count: number,
  unit: DateOffset['unit'],
  roundTo?: DateOffset['unit']
): DateOffset => (roundTo ? { count, unit, roundTo } : { count, unit });

const assertSubset = (range: TimeRange, expected: Partial<CheckedFields>) => {
  expect(range).toMatchObject(expected);
};

const runCorpus = (rows: CorpusRow[]) =>
  it.each(rows)('$input — $note', (row) => {
    assertSubset(textToTimeRange(row.input, row.options), row.expected);
  });

describe('parser corpus: textToTimeRange (English)', () => {
  describe('named ranges & aliases', () => {
    runCorpus([
      {
        input: 'today',
        note: 'start-of-day to start-of-day; no offset digits so offsets are null',
        expected: {
          start: 'now/d',
          end: 'now/d',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
          isNaturalLanguage: true,
          isInvalid: false,
          startOffset: null,
          endOffset: null,
        },
      },
      {
        input: 'yesterday',
        note: 'offset bounds carry count + rounding',
        expected: {
          start: 'now-1d/d',
          end: 'now-1d/d',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
          isNaturalLanguage: true,
          isInvalid: false,
          startOffset: offset(-1, 'd', 'd'),
          endOffset: offset(-1, 'd', 'd'),
        },
      },
      {
        input: 'this week',
        note: 'multi-word named range',
        expected: {
          start: 'now/w',
          end: 'now/w',
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
      {
        input: 'this month until now',
        note: 'week/month/year-to-date named range (rounded start → now)',
        expected: {
          start: 'now/M',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
      {
        input: 'last month',
        note: 'named range with month rounding',
        expected: {
          start: 'now-1M/M',
          end: 'now-1M/M',
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
      {
        input: 'next week',
        note: 'future named range — the "next …" counterpart of "last week"',
        expected: {
          start: 'now+1w/w',
          end: 'now+1w/w',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
      {
        input: 'next year',
        note: 'future named range with year rounding',
        expected: {
          start: 'now+1y/y',
          end: 'now+1y/y',
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
      {
        input: 'td',
        note: 'alias resolves to "today"',
        expected: { start: 'now/d', end: 'now/d', isNaturalLanguage: true, isInvalid: false },
      },
      {
        input: 'yd',
        note: 'alias resolves to "yesterday"',
        expected: { start: 'now-1d/d', end: 'now-1d/d', isNaturalLanguage: true, isInvalid: false },
      },
    ]);
  });

  describe('natural-language durations (isNaturalLanguage = true)', () => {
    runCorpus([
      {
        input: 'last 7 minutes',
        note: 'past duration → now-Nm to now',
        expected: {
          start: 'now-7m',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isNaturalLanguage: true,
          isInvalid: false,
          startOffset: offset(-7, 'm'),
          endOffset: null,
        },
      },
      {
        input: 'past 3 hours',
        note: '"past" is an alias of "last"',
        expected: {
          start: 'now-3h',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
      {
        input: 'next 3 days',
        note: 'future duration → now to now+Nd',
        expected: {
          start: 'now',
          end: 'now+3d',
          type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
          isNaturalLanguage: true,
          isInvalid: false,
          startOffset: null,
          endOffset: offset(3, 'd'),
        },
      },
    ]);
  });

  describe('natural-language instants (isNaturalLanguage = false)', () => {
    runCorpus([
      {
        input: '7 minutes ago',
        note: 'single instant → range to now; NL flag is false (unlike "last 7 minutes")',
        expected: {
          start: 'now-7m',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isNaturalLanguage: false,
          isInvalid: false,
        },
      },
      {
        input: 'in 7 minutes',
        note: 'future instant → now to now+Nm',
        expected: {
          start: 'now',
          end: 'now+7m',
          type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
          isNaturalLanguage: false,
          isInvalid: false,
        },
      },
      {
        input: '3 days from now',
        note: '"from now" future instant',
        expected: {
          start: 'now',
          end: 'now+3d',
          type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
          isNaturalLanguage: false,
          isInvalid: false,
        },
      },
    ]);
  });

  describe('shorthand datemath', () => {
    runCorpus([
      {
        input: '7d',
        note: 'bare shorthand defaults to past',
        expected: {
          start: 'now-7d',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isNaturalLanguage: false,
          startOffset: offset(-7, 'd'),
        },
      },
      {
        input: '-7d',
        note: 'explicit minus sign',
        expected: { start: 'now-7d', end: 'now', isInvalid: false },
      },
      {
        input: '+7d',
        note: 'plus sign → future range from now',
        expected: {
          start: 'now',
          end: 'now+7d',
          type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
          isInvalid: false,
        },
      },
      {
        input: 'now-7d/d',
        note: 'full datemath with rounding is preserved',
        expected: {
          start: 'now-7d/d',
          end: 'now',
          startOffset: offset(-7, 'd', 'd'),
          isInvalid: false,
        },
      },
      {
        input: '500ms',
        note: 'sub-second unit',
        expected: { start: 'now-500ms', end: 'now', startOffset: offset(-500, 'ms') },
      },
      {
        input: 'now/d',
        note: 'rounding-only datemath (no offset) → range to now',
        expected: {
          start: 'now/d',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          startOffset: null,
        },
      },
    ]);
  });

  describe('unix timestamps', () => {
    runCorpus([
      {
        input: '1700000000',
        note: '10-digit seconds → absolute instant to now',
        expected: {
          start: new Date(1700000000 * 1000).toISOString(),
          end: 'now',
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW],
          isNaturalLanguage: false,
          isInvalid: false,
        },
      },
      {
        input: '1700000000000',
        note: '13-digit milliseconds → same instant',
        expected: {
          start: new Date(1700000000000).toISOString(),
          end: 'now',
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW],
        },
      },
    ]);
  });

  describe('absolute dates (single instant → to now)', () => {
    runCorpus([
      {
        input: 'Jan 22, 2026',
        note: 'MMM D, YYYY → start of that day to now (current single-date behaviour)',
        expected: {
          start: new Date(2026, 0, 22).toISOString(),
          end: 'now',
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW],
          isNaturalLanguage: false,
          isInvalid: false,
        },
      },
      {
        input: '2016-02-03 19:00',
        note: 'ISO date with simple time',
        expected: {
          start: new Date(2016, 1, 3, 19, 0).toISOString(),
          end: 'now',
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW],
          isInvalid: false,
        },
      },
    ]);
  });

  describe('ranges (delimiter split)', () => {
    runCorpus([
      {
        input: 'now-7d to now',
        note: 'relative range via "to"',
        expected: {
          start: 'now-7d',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isInvalid: false,
        },
      },
      {
        input: '-1d until now',
        note: '"until" delimiter; shorthand left side',
        expected: {
          start: 'now-1d',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isInvalid: false,
        },
      },
      {
        input: '7d to 3d',
        note: 'both sides relative; start before end stays valid',
        expected: {
          start: 'now-7d',
          end: 'now-3d',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
          isInvalid: false,
        },
      },
      {
        input: '2016-02-03 to 2026-02-03',
        note: 'absolute range via "to"',
        expected: {
          start: new Date(2016, 1, 3).toISOString(),
          end: new Date(2026, 1, 3).toISOString(),
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          isInvalid: false,
        },
      },
      {
        input: 'Jan 1, 2026 - Jan 5, 2026',
        note: 'dash delimiter (requires surrounding spaces)',
        expected: {
          start: new Date(2026, 0, 1).toISOString(),
          end: new Date(2026, 0, 5).toISOString(),
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          isInvalid: false,
        },
      },
    ]);
  });

  describe('presets', () => {
    runCorpus([
      {
        input: 'My Preset',
        options: { presets: [{ label: 'My Preset', start: 'now-15m', end: 'now' }] },
        note: 'preset label match → preset bounds, NL flag true',
        expected: {
          start: 'now-15m',
          end: 'now',
          type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
          isNaturalLanguage: true,
          isInvalid: false,
        },
      },
    ]);
  });

  describe('roundRelativeTime option', () => {
    runCorpus([
      {
        input: 'last 7 minutes',
        options: { roundRelativeTime: true },
        note: 'true infers rounding from the offset unit (m → /m)',
        expected: { start: 'now-7m/m', end: 'now', startOffset: offset(-7, 'm', 'm') },
      },
      {
        input: 'last 7 days',
        options: { roundRelativeTime: true },
        note: 'day-and-above rounds to /d',
        expected: { start: 'now-7d/d', end: 'now', startOffset: offset(-7, 'd', 'd') },
      },
      {
        input: 'now-7d/d',
        options: { roundRelativeTime: false },
        note: 'false strips an existing rounding suffix from the start bound',
        expected: { start: 'now-7d', end: 'now', startOffset: offset(-7, 'd') },
      },
    ]);
  });

  describe('invalid input', () => {
    runCorpus([
      {
        input: '',
        note: 'empty string',
        expected: {
          start: '',
          end: '',
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          isNaturalLanguage: false,
          isInvalid: true,
          startOffset: null,
          endOffset: null,
        },
      },
      {
        input: 'gibberish xyz',
        note: 'unparseable text',
        expected: { isInvalid: true },
      },
      {
        input: 'last 7 dayz',
        note:
          'template shape with a mistyped unit — the unit word is matched leniently for ' +
          'part-level navigation, but the DURATION interpretation still rejects it ' +
          '(units are validated after matching), and the direction word marks the text ' +
          'as a failed phrase, blocking the forgiving absolute-date fallback',
        expected: { isInvalid: true },
      },
      {
        input: '5 minutes to spare',
        note:
          'natural-language vocabulary that matches no phrase template is a failed ' +
          'phrase — without the vocabulary check the forgiving absolute-date fallback ' +
          'would read the digits as a month and produce May 1',
        expected: { isInvalid: true },
      },
      {
        input: '5 minutes',
        note: 'bare "{count} {unit}" has no direction — ambiguous, so invalid',
        expected: { isInvalid: true },
      },
      {
        input: 'now to now-7d',
        note: 'reversed range (start after end) is invalid',
        expected: {
          start: 'now',
          end: 'now-7d',
          type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
          isInvalid: true,
        },
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// prettifyValue — the inverse: a stored value string → compact display text.
// ---------------------------------------------------------------------------

interface PrettifyRow {
  /** The raw controlled value, typically "{start} to {end}". */
  input: string;
  options?: PrettifyValueOptions;
  note: string;
  /** The simplified string shown in the edit input. */
  expected: string;
}

const runPrettify = (rows: PrettifyRow[]) =>
  it.each(rows)('$input — $note', (row) => {
    expect(prettifyValue(row.input, row.options)).toBe(row.expected);
  });

describe('parser corpus: prettifyValue (English)', () => {
  describe('relative ranges collapse to shorthand', () => {
    runPrettify([
      {
        input: 'now-7d/d to now',
        note: 'past range ending at now → start shorthand, rounding stripped from start',
        expected: '-7d',
      },
      {
        input: 'now to now+1d',
        note: 'future range from now → end shorthand',
        expected: '+1d',
      },
      {
        input: 'now-30d/d to now-7d/d',
        note: 'two offsets → start strips rounding, end keeps it',
        expected: '-30d to -7d/d',
      },
      {
        input: 'now-7d',
        note: 'single offset, no delimiter → shorthand',
        expected: '-7d',
      },
    ]);
  });

  describe('values that pass through unchanged', () => {
    runPrettify([
      {
        input: 'now/w to now',
        note: 'now + rounding-only has no offset → unchanged',
        expected: 'now/w to now',
      },
      {
        input: 'now',
        note: 'bare now',
        expected: 'now',
      },
      {
        input: 'last 3 weeks',
        note: 'natural language passes through',
        expected: 'last 3 weeks',
      },
      {
        input: '-7d to Jan 5, 2026',
        note: 'relative start, non-ISO absolute end (only ISO ends get reformatted)',
        expected: '-7d to Jan 5, 2026',
      },
    ]);
  });

  describe('presets and extra delimiters', () => {
    runPrettify([
      {
        input: 'now-15m to now',
        options: { presets: [{ label: 'Last 15 minutes', start: 'now-15m', end: 'now' }] },
        note: 'bounds matching a preset render the preset label',
        expected: 'Last 15 minutes',
      },
      {
        input: 'now-1d ~ now',
        options: { extraDelimiter: '~' },
        note: 'consumer-provided delimiter is accepted for the split',
        expected: '-1d',
      },
    ]);
  });

  describe('absolute ISO dates are formatted for display', () => {
    // This is the one display path whose output depends on the host timezone
    // (`moment(iso).format(...)` renders in local time). Rather than hardcode a
    // string that would only be correct in one timezone, we compute the expected
    // value with the same moment call the production code uses, from the same
    // local `Date` the input was built from — so the row is deterministic on any
    // machine. Every other corpus row asserts a literal string.
    runPrettify([
      {
        input: new Date(2026, 0, 22, 13, 30, 0).toISOString(),
        note: 'ISO 8601 → DEFAULT_DATE_FORMAT (computed in local TZ to stay deterministic)',
        expected: moment(new Date(2026, 0, 22, 13, 30, 0)).format(DEFAULT_DATE_FORMAT),
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Part-level parser — text → navigable RangePart tokens, and arrow-key edits.
// Rows assert the semantic decomposition (text / kind / navigable / rangeIndex);
// character offsets and formats are covered by parse_range_parts.test.ts.
// ---------------------------------------------------------------------------

type PartProjection = Pick<RangePart, 'text' | 'kind' | 'navigable' | 'rangeIndex'>;

const project = (parts: RangePart[]): PartProjection[] =>
  parts.map(({ text, kind, navigable, rangeIndex }) => ({ text, kind, navigable, rangeIndex }));

interface InputPartsRow {
  input: string;
  /** Start/end types used to assign a collapsed (single-sided) input to the correct side. */
  rangeType?: [DateType, DateType];
  locale?: string;
  note: string;
  expected: PartProjection[];
}

const runInputParts = (rows: InputPartsRow[]) =>
  it.each(rows)('$input — $note', (row) => {
    expect(project(parseInputParts(row.input, row.rangeType, row.locale))).toEqual(row.expected);
  });

interface DisplayPartsRow {
  display: string;
  locale?: string;
  note: string;
  expected: PartProjection[];
}

const runDisplayParts = (rows: DisplayPartsRow[]) =>
  it.each(rows)('$display — $note', (row) => {
    expect(project(parseDisplayParts(row.display, row.locale))).toEqual(row.expected);
  });

interface ModifyRow {
  text: string;
  /** Which part to step, found by kind (and rangeIndex when a side must be disambiguated). */
  kind: RangePart['kind'];
  action: ModificationAction;
  rangeIndex?: RangePart['rangeIndex'];
  locale?: string;
  note: string;
  /** New full input text, or `undefined` when the step is a no-op. */
  expected: string | undefined;
}

const runModify = (rows: ModifyRow[]) =>
  it.each(rows)('$text [$kind $action] — $note', (row) => {
    const parts = parseInputParts(row.text, undefined, row.locale);
    const part = parts.find(
      (candidate) =>
        candidate.kind === row.kind &&
        (row.rangeIndex === undefined || candidate.rangeIndex === row.rangeIndex)
    );
    if (!part) throw new Error(`no "${row.kind}" part found in "${row.text}"`);
    expect(applyPartModification(row.text, part, row.action, parts, row.locale)).toBe(row.expected);
  });

describe('parser corpus: part-level parser (English)', () => {
  describe('parseInputParts — edit-input decomposition', () => {
    runInputParts([
      {
        input: 'now',
        note: 'bare now is a single non-navigable literal',
        expected: [{ text: 'now', kind: 'literal', navigable: false, rangeIndex: 0 }],
      },
      {
        input: 'now-7d',
        note: 'shorthand relative → now / sign / value / unit',
        expected: [
          { text: 'now', kind: 'literal', navigable: false, rangeIndex: 0 },
          { text: '-', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'd', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'now-7d/d',
        note: 'rounding adds separator + rounding-unit parts',
        expected: [
          { text: 'now', kind: 'literal', navigable: false, rangeIndex: 0 },
          { text: '-', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'd', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
          { text: '/', kind: 'separator', navigable: false, rangeIndex: 0 },
          { text: 'd', kind: 'rounding-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'last 7 days',
        note: 'long relative → direction / value / unit',
        expected: [
          { text: 'last', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'days', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: '7 days ago',
        note: 'natural instant → value / unit / direction-literal',
        expected: [
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'days', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
          { text: 'ago', kind: 'literal', navigable: false, rangeIndex: 0 },
        ],
      },
      {
        input: 'in 5 minutes',
        note: '"in …" instant → literal / value / unit',
        expected: [
          { text: 'in', kind: 'literal', navigable: false, rangeIndex: 0 },
          { text: '5', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'minutes', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'Jan 22, 2026',
        note: 'absolute date → one navigable part per format token',
        expected: [
          { text: 'Jan', kind: 'month', navigable: true, rangeIndex: 0 },
          { text: '22', kind: 'day', navigable: true, rangeIndex: 0 },
          { text: '2026', kind: 'year', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'now-7d to now',
        note: 'delimiter split → left (rangeIndex 0), separator (null), right (rangeIndex 1)',
        expected: [
          { text: 'now', kind: 'literal', navigable: false, rangeIndex: 0 },
          { text: '-', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'd', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
          { text: 'to', kind: 'separator', navigable: false, rangeIndex: null },
          { text: 'now', kind: 'literal', navigable: false, rangeIndex: 1 },
        ],
      },
      {
        input: 'now+7d',
        rangeType: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
        note: 'collapsed future input is assigned to the end side (rangeIndex 1) via rangeType',
        expected: [
          { text: 'now', kind: 'literal', navigable: false, rangeIndex: 1 },
          { text: '+', kind: 'relative-direction', navigable: true, rangeIndex: 1 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 1 },
          { text: 'd', kind: 'relative-unit', navigable: true, rangeIndex: 1 },
        ],
      },
      {
        input: 'last 7 dayz',
        note:
          'a mistyped unit word still decomposes, keeping the correctly-typed parts ' +
          'arrow-navigable (units are validated on use, not while matching the phrase shape)',
        expected: [
          { text: 'last', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'dayz', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
    ]);
  });

  describe('parseDisplayParts — idle button display decomposition', () => {
    runDisplayParts([
      {
        display: 'Jan 1, 2026 → Jan 5, 2026',
        note: 'display delimiter "→" splits into two absolute sides',
        expected: [
          { text: 'Jan', kind: 'month', navigable: true, rangeIndex: 0 },
          { text: '1', kind: 'day', navigable: true, rangeIndex: 0 },
          { text: '2026', kind: 'year', navigable: true, rangeIndex: 0 },
          { text: '→', kind: 'separator', navigable: false, rangeIndex: null },
          { text: 'Jan', kind: 'month', navigable: true, rangeIndex: 1 },
          { text: '5', kind: 'day', navigable: true, rangeIndex: 1 },
          { text: '2026', kind: 'year', navigable: true, rangeIndex: 1 },
        ],
      },
      {
        display: 'Next 3 days',
        note: 'compact "Next …" maps to the end side (rangeIndex 1)',
        expected: [
          { text: 'Next', kind: 'relative-direction', navigable: true, rangeIndex: 1 },
          { text: '3', kind: 'relative-value', navigable: true, rangeIndex: 1 },
          { text: 'days', kind: 'relative-unit', navigable: true, rangeIndex: 1 },
        ],
      },
      {
        display: 'Last 7 days',
        note: 'compact "Last …" maps to the start side (rangeIndex 0)',
        expected: [
          { text: 'Last', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'days', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
    ]);
  });

  describe('applyPartModification — arrow-key stepping', () => {
    runModify([
      {
        text: 'now-7d',
        kind: 'relative-value',
        action: MODIFICATION_INCREASE,
        note: 'increment the count',
        expected: 'now-8d',
      },
      {
        text: 'now-7d',
        kind: 'relative-value',
        action: MODIFICATION_DECREASE,
        note: 'decrement the count',
        expected: 'now-6d',
      },
      {
        text: 'now-1d',
        kind: 'relative-value',
        action: MODIFICATION_DECREASE,
        note: 'count is floored at 1 → no-op',
        expected: undefined,
      },
      {
        text: 'now-7d',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        note: 'minus flips to plus',
        expected: 'now+7d',
      },
      {
        text: 'now+7d',
        kind: 'relative-direction',
        action: MODIFICATION_DECREASE,
        note: 'plus flips to minus',
        expected: 'now-7d',
      },
      {
        text: 'now-7d',
        kind: 'relative-unit',
        action: MODIFICATION_INCREASE,
        note: 'shorthand unit cycles up (d → w)',
        expected: 'now-7w',
      },
      {
        text: 'last 7 days',
        kind: 'relative-unit',
        action: MODIFICATION_INCREASE,
        note: 'word-form unit cycles up and re-pluralizes (days → weeks)',
        expected: 'last 7 weeks',
      },
      {
        text: 'last 7 days',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        note: 'last → next',
        expected: 'next 7 days',
      },
      {
        text: 'last 7 dayz',
        kind: 'relative-value',
        action: MODIFICATION_INCREASE,
        note: 'the count still steps while the unit word is mistyped',
        expected: 'last 8 dayz',
      },
      {
        text: 'last 7 dayz',
        kind: 'relative-unit',
        action: MODIFICATION_INCREASE,
        note: 'stepping the mistyped unit word itself is a no-op',
        expected: undefined,
      },
      {
        text: 'now-7d/d',
        kind: 'rounding-unit',
        action: MODIFICATION_DECREASE,
        note: 'rounding unit cycles down (d → h)',
        expected: 'now-7d/h',
      },
      {
        text: 'Jan 22, 2026',
        kind: 'day',
        action: MODIFICATION_INCREASE,
        note: 'absolute day steps forward, reformatted in place',
        expected: 'Jan 23, 2026',
      },
      {
        text: 'Jan 22, 2026',
        kind: 'month',
        action: MODIFICATION_INCREASE,
        note: 'absolute month steps forward',
        expected: 'Feb 22, 2026',
      },
      {
        text: 'Jan 22, 2026',
        kind: 'year',
        action: MODIFICATION_DECREASE,
        note: 'absolute year steps back',
        expected: 'Jan 22, 2025',
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Locale corpus — proves the merge requirement: a selected locale's grammar
// is recognized, AND English keeps parsing alongside it. Each locale block
// covers named ranges, durations, instants, and the locale's delimiter; the
// "merge" block proves English isn't lost when a locale is active.
// ---------------------------------------------------------------------------

describe('parser corpus: textToTimeRange (de-DE)', () => {
  const locale = 'de-DE';

  runCorpus([
    {
      input: 'heute',
      options: { locale },
      note: 'German named range "today"',
      expected: {
        start: 'now/d',
        end: 'now/d',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'diese woche bis jetzt',
      options: { locale },
      note: 'German week-to-date named range — "this week until now"',
      expected: {
        start: 'now/w',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'letzte 7 Minuten',
      options: { locale },
      note: 'German duration (past) — "last 7 minutes"',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'nächste 3 Tage',
      options: { locale },
      note: 'German duration (future) — "next 3 days"',
      expected: {
        start: 'now',
        end: 'now+3d',
        type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'dieser Monat',
      options: { locale },
      note: 'named range accepts the nominative case alongside the accusative "diesen Monat"',
      expected: { start: 'now/M', end: 'now/M', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'letzter Monat',
      options: { locale },
      note: 'named range accepts the nominative case alongside the accusative "letzten Monat"',
      expected: { start: 'now-1M/M', end: 'now-1M/M', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'nächste Woche',
      options: { locale },
      note: 'future named range — "next week"',
      expected: { start: 'now+1w/w', end: 'now+1w/w', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'nächster Monat',
      options: { locale },
      note: 'future named range — "next month" (nominative; the accusative "nächsten Monat" parses too)',
      expected: { start: 'now+1M/M', end: 'now+1M/M', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'nächstes Jahr',
      options: { locale },
      note: 'future named range — "next year"',
      expected: { start: 'now+1y/y', end: 'now+1y/y', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'letzter 1 Tag',
      options: { locale },
      note: 'gendered singular duration — masculine "Tag" takes "letzter"',
      expected: { start: 'now-1d', end: 'now', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'letztes 1 Jahr',
      options: { locale },
      note: 'gendered singular duration — neuter "Jahr" takes "letztes"',
      expected: { start: 'now-1y', end: 'now', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'nächster 1 Monat',
      options: { locale },
      note: 'gendered singular duration (future) — masculine "Monat" takes "nächster"',
      expected: { start: 'now', end: 'now+1M', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'letzten 30 Tagen',
      options: { locale },
      note: 'attributive/dative "-en" endings parse too ("in den letzten 30 Tagen" phrasing)',
      expected: { start: 'now-30d', end: 'now', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'vor 15 Tagen',
      options: { locale },
      note: 'dative plural instant — exactly what display generation emits for now-15d',
      expected: { start: 'now-15d', end: 'now', isNaturalLanguage: false, isInvalid: false },
    },
    {
      input: 'vor 7 Minuten',
      options: { locale },
      note: 'German instant (past) — "7 minutes ago"; NL flag false like its English counterpart',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isNaturalLanguage: false,
        isInvalid: false,
      },
    },
    {
      input: 'in 7 Minuten',
      options: { locale },
      note: 'German instant (future) — "in 7 minutes"',
      expected: {
        start: 'now',
        end: 'now+7m',
        type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
        isNaturalLanguage: false,
        isInvalid: false,
      },
    },
    {
      input: 'vor 7 Minuten bis jetzt',
      options: { locale },
      note: 'German delimiter "bis" splits a range explicitly',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isInvalid: false,
      },
    },
  ]);

  describe('merge requirement: English still parses with de-DE active', () => {
    runCorpus([
      {
        input: 'last 7 minutes',
        options: { locale },
        note: 'English duration phrase recognized while German is the active locale',
        expected: { start: 'now-7m', end: 'now', isNaturalLanguage: true, isInvalid: false },
      },
      {
        input: 'today',
        options: { locale },
        note: 'English named range recognized while German is the active locale',
        expected: { start: 'now/d', end: 'now/d', isNaturalLanguage: true, isInvalid: false },
      },
    ]);
  });
});

describe('parser corpus: textToTimeRange (fr-FR)', () => {
  const locale = 'fr-FR';

  runCorpus([
    {
      input: "aujourd'hui",
      options: { locale },
      note: 'French named range "today"',
      expected: {
        start: 'now/d',
        end: 'now/d',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: "cette semaine jusqu'à présent",
      options: { locale },
      note: 'French week-to-date named range — "this week until now"',
      expected: {
        start: 'now/w',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'derniers 7 minutes',
      options: { locale },
      note:
        'French duration (past) — the masculine-plural form parses even against a feminine ' +
        'unit (generation prefers the agreeing "dernières")',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'dernières 15 minutes',
      options: { locale },
      note: 'feminine plural agreement — "minute" is feminine, so "dernières" must parse',
      expected: { start: 'now-15m', end: 'now', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'dernière 1 heure',
      options: { locale },
      note: 'feminine singular agreement',
      expected: { start: 'now-1h', end: 'now', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'prochaines 15 minutes',
      options: { locale },
      note: 'feminine plural agreement (future)',
      expected: { start: 'now', end: 'now+15m', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'la semaine prochaine',
      options: { locale },
      note: 'future named range — "next week"',
      expected: { start: 'now+1w/w', end: 'now+1w/w', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'le mois prochain',
      options: { locale },
      note: 'future named range — "next month"',
      expected: { start: 'now+1M/M', end: 'now+1M/M', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: "l'année prochaine",
      options: { locale },
      note: 'future named range — "next year"',
      expected: { start: 'now+1y/y', end: 'now+1y/y', isNaturalLanguage: true, isInvalid: false },
    },
    {
      input: 'prochains 3 jours',
      options: { locale },
      note: 'French duration (future) — "next 3 days"',
      expected: {
        start: 'now',
        end: 'now+3d',
        type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
        isNaturalLanguage: true,
        isInvalid: false,
      },
    },
    {
      input: 'il y a 7 minutes',
      options: { locale },
      note:
        'French instant (past) — "7 minutes ago"; contains the accent-less delimiter word ' +
        '"a" but must NOT be split by it',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isNaturalLanguage: false,
        isInvalid: false,
      },
    },
    {
      input: 'dans 7 minutes',
      options: { locale },
      note: 'French instant (future) — "in 7 minutes"',
      expected: {
        start: 'now',
        end: 'now+7m',
        type: [DATE_TYPE_NOW, DATE_TYPE_RELATIVE],
        isNaturalLanguage: false,
        isInvalid: false,
      },
    },
    {
      input: 'now-7m à now',
      options: { locale },
      note: 'French delimiter "à" splits a range explicitly',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isInvalid: false,
      },
    },
    {
      input: 'now-7m a now',
      options: { locale },
      note: 'the delimiter is accepted without its accent, as commonly typed',
      expected: {
        start: 'now-7m',
        end: 'now',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW],
        isInvalid: false,
      },
    },
    {
      input: 'il y a 3 jours a il y a 2 jours',
      options: { locale },
      note:
        'accent-less "a" between two phrases that each CONTAIN the word "a" — only the ' +
        'candidate split whose sides both parse wins',
      expected: {
        start: 'now-3d',
        end: 'now-2d',
        type: [DATE_TYPE_RELATIVE, DATE_TYPE_RELATIVE],
        isNaturalLanguage: false,
        isInvalid: false,
      },
    },
  ]);

  describe('merge requirement: English still parses with fr-FR active', () => {
    runCorpus([
      {
        input: 'next 3 days',
        options: { locale },
        note: 'English duration phrase recognized while French is the active locale',
        expected: { start: 'now', end: 'now+3d', isNaturalLanguage: true, isInvalid: false },
      },
    ]);
  });
});

describe('parser corpus: prettifyValue (locales)', () => {
  runPrettify([
    {
      input: 'now-7m bis now',
      options: { locale: 'de-DE' },
      note: 'German "bis" delimiter is recognized for splitting and collapsing to shorthand',
      expected: '-7m',
    },
    {
      input: 'now-7m à now',
      options: { locale: 'fr-FR' },
      note: 'French "à" delimiter is recognized for splitting and collapsing to shorthand',
      expected: '-7m',
    },
    {
      input: 'now-7m a now',
      options: { locale: 'fr-FR' },
      note: 'the accent-less "a" delimiter collapses to shorthand too',
      expected: '-7m',
    },
  ]);
});

describe('parser corpus: part-level parser (locales)', () => {
  describe('parseInputParts — German', () => {
    runInputParts([
      {
        input: 'letzte 7 Tage',
        locale: 'de-DE',
        note: 'German duration → direction / value / unit',
        expected: [
          { text: 'letzte', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'Tage', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'vor 7 Tagen',
        locale: 'de-DE',
        note:
          'German instant → direction-literal / value / unit ("vor" is a PREFIX template, ' +
          'unlike English\'s suffix "ago"); dative plural alias "Tagen" recognized',
        expected: [
          { text: 'vor', kind: 'literal', navigable: false, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'Tagen', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'letzter 1 Tag',
        locale: 'de-DE',
        note: 'gendered singular duration decomposes like its plural counterpart',
        expected: [
          { text: 'letzter', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '1', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'Tag', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
    ]);
  });

  describe('parseInputParts — French', () => {
    runInputParts([
      {
        input: 'derniers 7 jours',
        locale: 'fr-FR',
        note: 'French duration → direction / value / unit',
        expected: [
          { text: 'derniers', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'jours', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        input: 'il y a 3 jours a il y a 2 jours',
        locale: 'fr-FR',
        note:
          'the accent-less "a" delimiter splits at the ONLY occurrence whose sides both ' +
          'parse, not at the "a" inside each "il y a" phrase',
        expected: [
          { text: 'il y a', kind: 'literal', navigable: false, rangeIndex: 0 },
          { text: '3', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'jours', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
          { text: 'a', kind: 'separator', navigable: false, rangeIndex: null },
          { text: 'il y a', kind: 'literal', navigable: false, rangeIndex: 1 },
          { text: '2', kind: 'relative-value', navigable: true, rangeIndex: 1 },
          { text: 'jours', kind: 'relative-unit', navigable: true, rangeIndex: 1 },
        ],
      },
    ]);
  });

  describe('parseDisplayParts — generated compact labels round-trip', () => {
    runDisplayParts([
      {
        display: 'Letzte 7 Tage',
        locale: 'de-DE',
        note: 'capitalized German compact label (as generated by formatCompactRelativeTime) still parses',
        expected: [
          { text: 'Letzte', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '7', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'Tage', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        display: 'Letzter 1 Tag',
        locale: 'de-DE',
        note: 'gender-agreeing German singular label (generation override) still parses',
        expected: [
          { text: 'Letzter', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '1', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'Tag', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
      {
        display: 'Dernières 15 minutes',
        locale: 'fr-FR',
        note: 'gender-agreeing French label (generation override) still parses',
        expected: [
          { text: 'Dernières', kind: 'relative-direction', navigable: true, rangeIndex: 0 },
          { text: '15', kind: 'relative-value', navigable: true, rangeIndex: 0 },
          { text: 'minutes', kind: 'relative-unit', navigable: true, rangeIndex: 0 },
        ],
      },
    ]);
  });

  describe('applyPartModification — locale-aware stepping', () => {
    runModify([
      {
        text: 'letzte 7 Tage',
        kind: 'relative-unit',
        action: MODIFICATION_INCREASE,
        locale: 'de-DE',
        note: 'German unit cycles up and re-pluralizes in German (Tage → Wochen)',
        expected: 'letzte 7 Wochen',
      },
      {
        text: 'letzte 7 Tage',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        locale: 'de-DE',
        note: 'German direction flips within German (letzte → nächste)',
        expected: 'nächste 7 Tage',
      },
      {
        text: 'derniers 7 jours',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        locale: 'fr-FR',
        note: 'French direction flips within French (derniers → prochains)',
        expected: 'prochains 7 jours',
      },
      {
        text: 'letzter 1 Tag',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        locale: 'de-DE',
        note: 'direction flip preserves the adjective inflection (letzter → nächster)',
        expected: 'nächster 1 Tag',
      },
      {
        text: 'dernières 15 minutes',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        locale: 'fr-FR',
        note: 'direction flip preserves the gender agreement (dernières → prochaines)',
        expected: 'prochaines 15 minutes',
      },
      {
        text: 'last 7 days',
        kind: 'relative-direction',
        action: MODIFICATION_INCREASE,
        locale: 'de-DE',
        note:
          'an English part stepped while German is active stays English — the active locale ' +
          'never silently translates text the user already typed',
        expected: 'next 7 days',
      },
    ]);
  });
});
