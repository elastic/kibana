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

/** An HJSON spec for the text. */
export const toHjsonSpec = (value: string): VegaSpec => ({ format: 'hjson', value });

/** The text the spec editor shows for a spec. */
export const specToEditorValue = (spec: VegaSpec): string =>
  spec.format === 'json' ? JSON.stringify(spec.value, null, 2) : spec.value;

/** The spec for the text in the editor, keeping JSON only while it still parses. */
export const specFromEditor = (text: string, format: VegaSpec['format']): VegaSpec => {
  if (format === 'json') {
    try {
      return { format: 'json', value: JSON.parse(text) };
    } catch {
      return toHjsonSpec(text);
    }
  }
  return toHjsonSpec(text);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The spec as an object, or `undefined` when it isn't one. HJSON without root braces parses to a
 * string, as it does when the Vega panel renders, and JSON from the editor can be any value.
 */
export const parseSpec = (spec: VegaSpec): Record<string, unknown> | undefined => {
  let parsed: unknown;
  try {
    parsed =
      spec.format === 'json' ? spec.value : parse(spec.value, { legacyRoot: false, keepWsc: true });
  } catch {
    return undefined;
  }
  return isRecord(parsed) ? parsed : undefined;
};

/** ES|QL `data.url.query` strings from the top-level data sources of a parsed spec. */
export const getEsqlQueriesFromSpec = ({ data }: { data?: unknown }): string[] =>
  [data ?? []].flat().flatMap((source) => {
    const url = isRecord(source) ? source.url : undefined;
    return isRecord(url) && url['%type%'] === 'esql' && typeof url.query === 'string'
      ? [url.query]
      : [];
  });
