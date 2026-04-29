/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Workflow authors may interpolate Liquid into ES|QL strings, e.g.
 *   FROM logs-{{ inputs.env }}-* | WHERE host.name == "{{ inputs.host }}"
 *
 * The ES|QL parser doesn't recognize Liquid and would treat `{{` as a syntax
 * error. The autocomplete pipeline replaces every Liquid span with whitespace
 * of the same length so cursor offsets remain valid for the surrounding ES|QL.
 *
 * We also report each masked region so the suggestion provider can suppress
 * results when the cursor is sitting inside a template.
 */

export interface LiquidMaskedSlice {
  /** ES|QL text with each Liquid span overwritten by spaces, same length as input. */
  text: string;
  /** Half-open ranges in the original string where Liquid was masked. */
  maskedRanges: ReadonlyArray<{ start: number; end: number }>;
}

const LIQUID_PATTERN = /\{\{[\s\S]*?\}\}|\{%-?[\s\S]*?-?%\}/g;

export function liquidAwareEsqlSlice(esql: string): LiquidMaskedSlice {
  if (!esql || (esql.indexOf('{{') === -1 && esql.indexOf('{%') === -1)) {
    return { text: esql, maskedRanges: [] };
  }

  const masked: Array<{ start: number; end: number }> = [];
  const out = esql.replace(LIQUID_PATTERN, (match, offset: number) => {
    masked.push({ start: offset, end: offset + match.length });
    // Replace newlines too — keeping length stable means line/column math
    // computed against the original text remains valid for everything outside.
    return ' '.repeat(match.length);
  });

  return { text: out, maskedRanges: masked };
}

export function isOffsetInsideMaskedRange(
  offset: number,
  ranges: ReadonlyArray<{ start: number; end: number }>
): boolean {
  for (const range of ranges) {
    if (offset >= range.start && offset < range.end) {
      return true;
    }
  }
  return false;
}
