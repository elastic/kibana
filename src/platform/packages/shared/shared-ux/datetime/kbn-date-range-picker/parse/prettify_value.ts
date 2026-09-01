/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';

import { DATE_RANGE_INPUT_DELIMITER, DEFAULT_DATE_FORMAT } from '../constants';
import type { TimePrecision, TimeRangeBoundsOption } from '../types';
import { applyTimePrecision } from '../format';
import { buildDelimiterPattern, getCompiledGrammar, normalizeDigits } from './locale_grammar';
import { textToTimeRange } from './parse_text';

/**
 * Simplifies a dateMath value string into a compact shorthand suitable for
 * display in the input field.
 *
 * - `now-7d/d to now`          → `-7d/d`
 * - `now to now+1d`            → `+1d`
 * - `now-30d/d to now-7d/d`    → `-30d/d to -7d/d`
 * - `now/w to now`             → `now/w to now` (now + rounding only → unchanged)
 * - Natural language ("last 3 weeks") and absolute dates pass through unchanged.
 *
 * Rounding suffixes are always preserved: rounding policy belongs to the
 * parser (the `roundRelativeTime` setting), not to this display layer.
 */

// Matches a dateMath relative expression with an offset: optional "now", sign, digits, unit, optional rounding.
// Does NOT match bare "now" or "now/unit" (those have no offset).
const DATEMATH_OFFSET_RE = /^(now)?([+-])(\d+)([a-zA-Z]+)(\/[smhdwMy])?$/;

/**
 * Builds the full set of delimiter patterns by combining the active grammar's
 * delimiters (English ⊕ locale, plus the universal dash), the protocol-level
 * `DATE_RANGE_INPUT_DELIMITER`, and an optional consumer delimiter.
 */
const getDelimiterPatterns = (
  extraDelimiter: string | undefined,
  locale: string | undefined
): RegExp[] => {
  const compiled = getCompiledGrammar(locale ?? i18n.getLocale());
  const extraPatterns = [
    { text: DATE_RANGE_INPUT_DELIMITER },
    ...(extraDelimiter ? [{ text: extraDelimiter }] : []),
  ]
    .map(buildDelimiterPattern)
    .filter((p): p is RegExp => p !== null);

  return [...compiled.delimiterPatterns, ...extraPatterns];
};

/**
 * Formats an ISO 8601 date string into a human-readable display format at the
 * requested sub-minute precision. Returns `null` if the string is not a valid
 * ISO date.
 */
const prettifyAbsoluteDate = (bound: string, precision: TimePrecision = 'ms'): string | null => {
  const parsed = moment(bound, moment.ISO_8601, true);
  return parsed.isValid()
    ? parsed.format(applyTimePrecision(DEFAULT_DATE_FORMAT, precision))
    : null;
};

/**
 * Strips the `now` prefix from a dateMath offset bound, preserving any
 * rounding suffix. Returns `null` if the bound is not a relative offset
 * expression (bare `now`, `now/w`, absolute dates, natural language all
 * return null).
 */
const prettifyRelativeBound = (bound: string): string | null => {
  const match = bound.match(DATEMATH_OFFSET_RE);
  if (!match) return null;

  // first two values omitted on purpose
  const [, , sign, count, unit, rounding] = match;
  return `${sign}${count}${unit}${rounding ?? ''}`;
};

export interface PrettifyValueOptions {
  /** Optional consumer-provided delimiter (from `TimeRangeTransformOptions`). */
  extraDelimiter?: string;
  /** Presets to match against — if the value's bounds match a preset, its label is used. */
  presets?: TimeRangeBoundsOption[];
  /** Locale used to recognise the value's delimiter. @default `i18n.getLocale()` */
  locale?: string;
}

/**
 * Tries to match a split `{start, end}` pair against a preset.
 * Returns the preset label only when it is natural language (e.g. "Last 7 days",
 * "Today") and therefore safe to show in the editable input. Display-form labels
 * (e.g. `"Feb 3 → Feb 10"`) must not leak into the input; we gate on
 * `isNaturalLanguage` rather than `!isInvalid` because moment's forgiving parser
 * "validates" display labels by matching a fragment, so they are prettified from
 * their bounds instead.
 */
const matchPresetBounds = (
  start: string,
  end: string,
  presets: TimeRangeBoundsOption[],
  locale: string | undefined
): string | null => {
  const match = presets.find((p) => p.start === start && p.end === end);
  if (!match?.label) return null;

  // Pass only `locale` to the parser: including `presets` would let the matched
  // preset's own label self-match as "natural language".
  return textToTimeRange(match.label, { locale }).isNaturalLanguage ? match.label : null;
};

/**
 * Prettifies a controlled `value` string for display in the edit input.
 *
 * @param value The raw value string, typically `"{start} to {end}"`.
 * @param options Optional config: extra delimiter and presets.
 * @returns A simplified string, or the original value if no simplification applies.
 */
export const prettifyValue = (value: string, options?: PrettifyValueOptions): string => {
  const trimmed = normalizeDigits(value.trim());
  if (!trimmed) return value;

  const { extraDelimiter, presets = [], locale } = options ?? {};
  const patterns = getDelimiterPatterns(extraDelimiter, locale);

  // Try splitting on delimiters
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const [, rawStart, rawEnd] = match;
      const start = rawStart.trim();
      const end = rawEnd.trim();

      // Check if bounds match a preset label
      if (presets.length > 0) {
        const presetLabel = matchPresetBounds(start, end, presets, locale);
        if (presetLabel) return presetLabel;
      }

      const prettyStart = prettifyRelativeBound(start);
      const prettyEnd = prettifyRelativeBound(end);

      // Both bounds are "now" (with or without rounding) — format any absolute dates
      if (!prettyStart && !prettyEnd) {
        const absStart = prettifyAbsoluteDate(start);
        const absEnd = prettifyAbsoluteDate(end);
        if (!absStart && !absEnd) return trimmed;
        const delim = DATE_RANGE_INPUT_DELIMITER;
        return `${absStart ?? start} ${delim} ${absEnd ?? end}`;
      }

      // One bound is "now" and the other is a relative offset → collapse
      if (end === 'now' && prettyStart) return prettyStart;
      if (start === 'now' && prettyEnd) return prettyEnd;

      const delim = DATE_RANGE_INPUT_DELIMITER;

      // Both are relative offsets → show "start {delim} end" with prettified bounds
      if (prettyStart && prettyEnd) return `${prettyStart} ${delim} ${prettyEnd}`;

      // One side is a relative offset, other is absolute/now-rounding → prettify what we can
      return `${prettyStart ?? prettifyAbsoluteDate(start) ?? start} ${delim} ${
        prettyEnd ?? prettifyAbsoluteDate(end) ?? end
      }`;
    }
  }

  // No delimiter found — try prettifying as a single dateMath expression
  if (trimmed === 'now') return trimmed;
  const prettySingle = prettifyRelativeBound(trimmed);
  if (prettySingle) return prettySingle;

  // Try formatting as an absolute ISO date
  const prettyAbsolute = prettifyAbsoluteDate(trimmed);
  if (prettyAbsolute) return prettyAbsolute;

  // Natural language or anything else — pass through unchanged
  return trimmed;
};
