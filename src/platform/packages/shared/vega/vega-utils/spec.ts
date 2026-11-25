/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import type { VegaSpec } from '@kbn/vega-schemas';

/** The text the spec editor shows for a spec. */
export const specToEditorValue = (spec: VegaSpec): string =>
  spec.format === 'json' ? JSON.stringify(spec.value, null, 2) : spec.value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The spec for the text in the editor, keeping JSON only while it parses to an object. */
export const specFromEditor = (text: string, format: VegaSpec['format']): VegaSpec => {
  if (format === 'json') {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isRecord(parsed)) return { format: 'json', value: parsed };
    } catch {
      // Text that isn't JSON yet is kept as HJSON below.
    }
  }
  return { format: 'hjson', value: text };
};

/**
 * The spec as an object, or `undefined` when its HJSON doesn't parse to an object. HJSON without
 * root braces parses to a string, as it does when the Vega panel renders.
 */
export const parseSpec = (spec: VegaSpec): Record<string, unknown> | undefined => {
  if (spec.format === 'json') return spec.value;
  try {
    const parsed: unknown = parse(spec.value, { legacyRoot: false, keepWsc: true });
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/** ES|QL `data.url.query` strings from the top-level data sources of a parsed spec. */
export const getEsqlQueriesFromSpec = ({ data }: { data?: unknown }): string[] =>
  [data ?? []].flat().flatMap((source) => {
    const url = isRecord(source) ? source.url : undefined;
    return isRecord(url) && url['%type%'] === 'esql' && typeof url.query === 'string'
      ? [url.query]
      : [];
  });
