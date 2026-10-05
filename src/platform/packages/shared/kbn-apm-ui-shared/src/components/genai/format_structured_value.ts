/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isRecord } from './parse_genai_value';

export const MAX_ARRAY_ITEMS = 200;

const INDENT = '  ';

const isEmptyCollection = (value: unknown): boolean =>
  (Array.isArray(value) && value.length === 0) ||
  (isRecord(value) && Object.keys(value).length === 0);

const isMultiline = (value: unknown): value is string =>
  typeof value === 'string' && value.includes('\n');

// Strings YAML would read as something else (a nested key, comment, number,
// boolean, null, or an indicator character) are quoted, as a YAML serializer would.
const AMBIGUOUS_STRING =
  /^\s|\s$|: |:$| #|^[-?:,[\]{}#&*!|>'"%@`]|^(true|false|null|~|yes|no|on|off)$|^[-+]?(\d|\.\d)/i;

const formatScalar = (value: unknown): string => {
  if (value == null) return 'null';
  if (Array.isArray(value)) return '[]';
  if (typeof value === 'object') return '{}';
  if (typeof value === 'string' && (value === '' || AMBIGUOUS_STRING.test(value))) {
    return JSON.stringify(value);
  }
  return String(value);
};

const isScalar = (value: unknown): boolean =>
  (value == null || typeof value !== 'object' || isEmptyCollection(value)) && !isMultiline(value);

const formatBlockString = (value: string, indent: string): string[] =>
  value.split('\n').map((line) => `${indent}${line}`);

const formatLines = (value: unknown, indent: string): string[] => {
  if (isScalar(value)) return [`${indent}${formatScalar(value)}`];
  if (isMultiline(value)) return formatBlockString(value, indent);

  if (Array.isArray(value)) {
    const lines = value.slice(0, MAX_ARRAY_ITEMS).flatMap((item) => {
      if (isScalar(item)) return [`${indent}- ${formatScalar(item)}`];
      if (isMultiline(item)) return [`${indent}- |`, ...formatBlockString(item, indent + INDENT)];
      // Nested collections start on the dash line, YAML-style.
      const [first, ...rest] = formatLines(item, indent + INDENT);
      return [`${indent}- ${first.trimStart()}`, ...rest];
    });
    const hidden = value.length - MAX_ARRAY_ITEMS;
    if (hidden > 0) {
      lines.push(
        `${indent}# ${i18n.translate('apmUiShared.genAi.structuredValue.moreItems', {
          defaultMessage: '… {count} more items',
          values: { count: hidden },
        })}`
      );
    }
    return lines;
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    if (isScalar(item)) return [`${indent}${key}: ${formatScalar(item)}`];
    if (isMultiline(item))
      return [`${indent}${key}: |`, ...formatBlockString(item, indent + INDENT)];
    return [`${indent}${key}:`, ...formatLines(item, indent + INDENT)];
  });
};

/**
 * Formats structured data as YAML-like text: `key: value` rows, `-` list
 * items, and multi-line strings as `|` blocks so their line breaks are kept.
 */
export const formatStructuredValue = (value: unknown): string => formatLines(value, '').join('\n');
