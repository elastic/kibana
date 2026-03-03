/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

import type { DATE_TYPE_ABSOLUTE, DATE_TYPE_RELATIVE, DATE_TYPE_NOW } from './constants';

export type DateType = typeof DATE_TYPE_ABSOLUTE | typeof DATE_TYPE_RELATIVE | typeof DATE_TYPE_NOW;

/** Elastic dataMath string or ISO 8601 yyyy-MM-ddTHH:mm:ss.SSSZ e.g. 2025-12-23T08:15:13Z */
export type DateString = string;

/**
 * Determines which element receives focus when ArrowDown is pressed from the input.
 * A string is treated as a CSS selector resolved against the panel; a ref points
 * to the element directly. When unset, defaults to the panel div itself.
 */
export type InitialFocus = RefObject<HTMLElement | null> | string;

export interface TimeRangeBounds {
  end: DateString;
  start: DateString;
}

/** Used for presets and recent options */
export interface TimeRangeBoundsOption extends TimeRangeBounds {
  label?: string;
}

/** Canonical date-math time units */
export type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

/** Structured offset extracted from a relative date-math string like `now-7d/d` */
export interface DateOffset {
  /** Signed offset. Negative = past, positive = future. */
  count: number;
  /** Time unit for the offset */
  unit: TimeUnit;
  /** Optional rounding unit (the `/d` in `now-1d/d`) */
  roundTo?: TimeUnit;
}

/**
 * Locale definition for the date range text parser.
 *
 * Templates use `{count}` and `{unit}` placeholders. The parser converts
 * `{count}` to `(\d+)` and `{unit}` to `(\w+)` when building regexes,
 * tracking capture-group positions from the template. This handles
 * arbitrary word order across languages.
 *
 * The parser always supports these universally, regardless of locale:
 * - Delimiter: `'-'` (with spaces: `start - end`)
 * - Absolute formats: ISO 8601, unix timestamps (10-digit seconds, 13-digit ms)
 */
export interface ParserLocale {
  /** The keyword for "now" in input text */
  now: string;
  /** Additional locale-specific delimiters (e.g. `['to', 'until']` for English). `'-'` is always accepted. */
  delimiters: string[];
  /** Named ranges: label -> datemath bounds */
  namedRanges: Record<string, { start: string; end: string }>;
  /** Maps user-typed unit strings to canonical TimeUnit */
  unitAliases: Record<string, TimeUnit>;
  /** Natural language duration patterns with `{count}` and `{unit}` placeholders */
  naturalDuration: {
    past: string[];
    future: string[];
  };
  /** Natural language instant patterns with `{count}` and `{unit}` placeholders */
  naturalInstant: {
    past: string[];
    future: string[];
  };
  /** Additional locale-specific absolute date formats (moment.js format strings). ISO 8601 and unix timestamps are always accepted. */
  absoluteFormats: string[];
}

export interface TimeRangeTransformOptions {
  presets?: TimeRangeBoundsOption[];
  /** Locale for the parser. @default English */
  locale?: ParserLocale;
  /** Additional accepted delimiter (on top of locale and universal `'-'`) */
  delimiter?: string;
  dateFormat?: string;
}

export interface TimeRange {
  value: string;
  start: DateString;
  end: DateString;
  startDate: Date | null;
  endDate: Date | null;
  type: [DateType, DateType];
  isNaturalLanguage: boolean;
  isInvalid: boolean;
  /** Non-null only when the start bound is RELATIVE */
  startOffset: DateOffset | null;
  /** Non-null only when the end bound is RELATIVE */
  endOffset: DateOffset | null;
}
