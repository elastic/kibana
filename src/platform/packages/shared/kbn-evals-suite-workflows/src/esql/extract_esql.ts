/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';
import { collectAllSteps } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';

export const ESQL_QUERY_STEP_TYPE = 'elasticsearch.esql.query';

/**
 * One `elasticsearch.esql.query` step query, prepared for evaluation.
 *
 * - `executable`: Liquid sits only inside string literals or comments, so
 *   `query` has every Liquid span replaced with a typed placeholder and can
 *   be parsed and executed.
 * - `structural`: Liquid sits in a structural position (`FROM {{ idx }}`,
 *   `LIMIT {{ n }}`, a `{% if %}` block). The real query is only known at
 *   run time, so the evaluators do not score it.
 */
export interface ExtractedEsqlQuery {
  stepName: string;
  rawQuery: string;
  query: string;
  status: 'executable' | 'structural';
}

type ScannerState = 'normal' | 'string-double' | 'string-triple' | 'line-comment' | 'block-comment';

interface LiquidSpan {
  start: number;
  end: number;
  inString: boolean;
}

const LIQUID_OPENERS: ReadonlyArray<[string, string]> = [
  ['{{', '}}'],
  ['{%', '%}'],
  ['{#', '#}'],
];

const matchLiquid = (text: string, pos: number): { end: number } | null | undefined => {
  for (const [open, close] of LIQUID_OPENERS) {
    if (text.startsWith(open, pos)) {
      const closeAt = text.indexOf(close, pos + open.length);
      return closeAt === -1 ? null : { end: closeAt + close.length };
    }
  }
  return undefined;
};

/**
 * Finds every Liquid span in an ES|QL string and records whether it sits
 * inside a string literal / comment (safe to replace) or in a structural
 * position. Returns `null` when a Liquid span is unclosed. Mirrors the
 * scanner in `workflows_management/common/lib/esql_validation`.
 */
const scanLiquidSpans = (text: string): LiquidSpan[] | null => {
  const spans: LiquidSpan[] = [];
  let state: ScannerState = 'normal';
  let i = 0;

  while (i < text.length) {
    const liquid = matchLiquid(text, i);
    if (liquid === null) return null;
    if (liquid) {
      spans.push({ start: i, end: liquid.end, inString: state !== 'normal' });
      i = liquid.end;
    } else if (state === 'normal') {
      if (text.startsWith('"""', i)) {
        state = 'string-triple';
        i += 3;
      } else if (text[i] === '"') {
        state = 'string-double';
        i += 1;
      } else if (text.startsWith('//', i)) {
        state = 'line-comment';
        i += 2;
      } else if (text.startsWith('/*', i)) {
        state = 'block-comment';
        i += 2;
      } else {
        i += 1;
      }
    } else if (state === 'string-double') {
      if (text[i] === '\\') {
        i += 2;
      } else {
        if (text[i] === '"') state = 'normal';
        i += 1;
      }
    } else if (state === 'string-triple' && text.startsWith('"""', i)) {
      state = 'normal';
      i += 3;
    } else if (state === 'line-comment' && text[i] === '\n') {
      state = 'normal';
      i += 1;
    } else if (state === 'block-comment' && text.startsWith('*/', i)) {
      state = 'normal';
      i += 2;
    } else {
      i += 1;
    }
  }

  return spans;
};

const TIME_HINT = /time|date|_start|start_|_end\b|end_|since|until|_from\b|_to\b/i;
const IP_HINT = /\bip\b|_ip\b|\.ip\b/i;
const NUMBER_HINT = /count|threshold|limit|size|port|bytes|score|amount|duration|pct|number/i;

/**
 * Picks a placeholder that parses as the likely type of a Liquid value inside
 * a string literal. ES|QL casts string literals implicitly when compared with
 * a date, IP or numeric field, so a blank string would fail at execution time
 * for reasons unrelated to the query the model wrote.
 */
export const placeholderForLiquid = (liquid: string): string => {
  if (TIME_HINT.test(liquid)) return '2025-01-01T00:00:00.000Z';
  if (IP_HINT.test(liquid)) return '127.0.0.1';
  if (NUMBER_HINT.test(liquid)) return '1';
  return 'placeholder';
};

/** Replaces Liquid with typed placeholders; returns `structural` if any span is outside a string. */
export const maskLiquidInEsql = (
  query: string
): { query: string; status: ExtractedEsqlQuery['status'] } => {
  const spans = scanLiquidSpans(query);
  if (spans === null || spans.some(({ inString }) => !inString)) {
    return { query, status: 'structural' };
  }
  if (spans.length === 0) {
    return { query, status: 'executable' };
  }
  const parts: string[] = [];
  let cursor = 0;
  for (const { start, end } of spans) {
    parts.push(query.slice(cursor, start), placeholderForLiquid(query.slice(start, end)));
    cursor = end;
  }
  parts.push(query.slice(cursor));
  return { query: parts.join(''), status: 'executable' };
};

/** Collects the query of every `elasticsearch.esql.query` step, including nested steps. */
export const extractEsqlQueriesFromYaml = (yaml: string | undefined): ExtractedEsqlQuery[] => {
  if (!yaml) return [];
  let parsed: unknown;
  try {
    parsed = parseYaml(yaml);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null) return [];
  const { steps } = parsed as Partial<WorkflowYaml>;
  if (!Array.isArray(steps)) return [];

  return collectAllSteps(steps)
    .filter((step) => step.type === ESQL_QUERY_STEP_TYPE)
    .map((step) => {
      const rawQuery = (step as { with?: { query?: unknown } }).with?.query;
      const text = typeof rawQuery === 'string' ? rawQuery : '';
      return { stepName: step.name, rawQuery: text, ...maskLiquidInEsql(text) };
    });
};
