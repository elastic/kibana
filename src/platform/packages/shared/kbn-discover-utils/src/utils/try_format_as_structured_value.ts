/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unescape } from 'lodash';
import type { ReactNode } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { EsHitRecord } from '../types';
import { formatFieldStringValueWithHighlights } from './format_value';

/**
 * A non-JSON value at or below this length (and without newlines) is considered
 * short enough to render as a single-line value rather than a structured one.
 */
export const STRUCTURED_VALUE_LENGTH_THRESHOLD = 300;

/**
 * Attempts to parse a value as JSON and pretty-print it. Returns undefined if the
 * value is not valid JSON, so callers can fall back to treating it as plain text.
 */
export const tryPrettyPrintJson = (value: string): string | undefined => {
  try {
    return JSON.stringify(JSON.parse(unescape(value)), null, 2);
  } catch {
    return undefined;
  }
};

export interface StructuredValueFormat {
  language: 'json' | 'txt';
  content: ReactNode;
}

export interface TryFormatAsStructuredValueParams {
  /** The raw, unformatted field value. */
  value: unknown;
  /**
   * Lazily produces the already-formatted (and highlighted) value. Only invoked
   * when the value qualifies as a structured value but isn't JSON, so callers
   * don't pay for formatting a value that ends up unused (e.g. the JSON branch
   * always re-formats from the pretty-printed string instead).
   */
  getFormattedValue: () => ReactNode;
  hit: EsHitRecord;
  fieldFormats: FieldFormatsStart;
  dataView?: DataView;
  field?: DataViewField;
  /** The field name for highlight lookup, used when `field` is not resolved from the data view. */
  fieldName?: string;
}

/**
 * Determines whether a field value qualifies as a "structured value" — either valid
 * JSON, or a long/multi-line block of text — and if so, returns the language and
 * content to render inside a code block instead of a single-line formatted value.
 *
 * Returns undefined when the value doesn't qualify, so callers can fall back to
 * their normal single-line rendering.
 */
export const tryFormatAsStructuredValue = ({
  value,
  getFormattedValue,
  hit,
  fieldFormats,
  dataView,
  field,
  fieldName,
}: TryFormatAsStructuredValueParams): StructuredValueFormat | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const valueAsString = String(value);
  const prettyJson = tryPrettyPrintJson(valueAsString);

  if (prettyJson !== undefined) {
    return {
      language: 'json',
      // Highlighted substrings are preserved by ES within JSON string values, so
      // re-running the highlight pass against the pretty-printed text still works.
      content: formatFieldStringValueWithHighlights({
        value: prettyJson,
        hit,
        fieldFormats,
        dataView,
        fieldName: field?.name ?? fieldName,
      }),
    };
  }

  const isLong =
    valueAsString.includes('\n') || valueAsString.length > STRUCTURED_VALUE_LENGTH_THRESHOLD;

  return isLong ? { language: 'txt', content: getFormattedValue() } : undefined;
};
