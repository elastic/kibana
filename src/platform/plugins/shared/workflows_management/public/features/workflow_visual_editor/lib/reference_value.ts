/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDynamicValue, isVariableValue } from '@kbn/workflows-yaml';
import type { DataReferenceCatalog, DataReferenceItem } from './build_data_reference_catalog';
import { formatValueReferenceToken, toReferenceIconType } from './build_data_reference_catalog';

/** `text` is `{{ … }}` (always becomes a string); `value` is `${{ … }}` (keeps its type). */
export type ReferenceForm = 'text' | 'value';

export interface WholeReference {
  readonly form: ReferenceForm;
  /** The expression between the delimiters, trimmed (`steps.a.output.hits`, `x | json`). */
  readonly expression: string;
}

/**
 * Parses a value that is exactly one reference. Sentences that merely contain references,
 * and values mixing several `{{ }}` spans, are not whole references.
 */
export const parseWholeReference = (value: unknown): WholeReference | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed: WholeReference | undefined = isDynamicValue(value)
    ? { form: 'value', expression: value.slice(3, -2).trim() }
    : isVariableValue(value)
    ? { form: 'text', expression: value.slice(2, -2).trim() }
    : undefined;
  if (!parsed || parsed.expression.includes('{{') || parsed.expression.includes('}}')) {
    return undefined;
  }
  return parsed;
};

/** Rewrites a whole text-form reference (`{{ x }}`) as the value form (`${{ x }}`). */
export const toValueFormToken = (token: string): string => {
  const reference = parseWholeReference(token);
  return reference ? formatValueReferenceToken(reference.expression) : token;
};

/**
 * What to write for a picked reference. A field that asks for it (`valueFormWhenWhole`) gets the
 * value form when the pick fills the whole field, i.e. nothing but whitespace is left outside
 * `[start, end)`, so a lone reference keeps its type; any other pick stays as picked.
 */
export const tokenForInsert = (
  picked: string,
  text: string,
  start: number,
  end: number,
  valueFormWhenWhole: boolean
): string =>
  valueFormWhenWhole && `${text.slice(0, start)}${text.slice(end)}`.trim() === ''
    ? toValueFormToken(picked)
    : picked;

/**
 * True when a reference is known to hold a list or record. A filter (`| json`, `| join`) already
 * shapes the data into something else, so those don't count.
 */
export const isContainerReference = (expression: string, typeLabel?: string): boolean => {
  const iconType = toReferenceIconType(typeLabel ?? 'unknown');
  return (iconType === 'array' || iconType === 'object') && !expression.includes('|');
};

/**
 * Applies the written-form rule to a value that may be anything: a whole reference keeps its
 * type (`${{ }}`), while a reference inside a sentence is text (`{{ }}`), because the value form
 * only works as the whole value.
 */
export const normalizeReferenceForm = (text: string): string => {
  const whole = parseWholeReference(text);
  if (whole) return whole.form === 'text' ? formatValueReferenceToken(whole.expression) : text;
  return text.includes('${{') ? text.replaceAll('${{', '{{') : text;
};

/** Blanks out quoted text so operators and pipes inside a string literal don't count. */
const blankQuoted = (expression: string): string =>
  expression.replace(/'[^']*'|"[^"]*"/g, (quoted) => '_'.repeat(quoted.length));

const COMPARISON_OR_LOGIC = /==|!=|<>|<=|>=|<|>|\s(?:contains|and|or)\s/;

/**
 * Type label of a reference expression, or undefined when it isn't known (the `unknown` icon).
 *
 * - A filter (`| json`, `| size`) reshapes the value in ways we don't model, so it is unknown
 *   rather than the type before the filter.
 * - A comparison or `and` / `or` yields a boolean whatever its operands are, so `a.b != blank`
 *   is boolean even when `a.b` is unknown.
 * - Anything else is a path, looked up in the catalog. Step entities and their undeclared
 *   `output` leaf share a path, so the leaf (the more specific label) wins.
 */
export const lookupReferenceTypeLabel = (
  catalog: DataReferenceCatalog,
  expression: string
): string | undefined => {
  const unquoted = blankQuoted(expression);
  if (unquoted.includes('|')) return undefined;
  if (COMPARISON_OR_LOGIC.test(unquoted)) return 'boolean';
  const path = expression.trim();
  let entityLabel: string | undefined;
  const walk = (items: readonly DataReferenceItem[]): string | undefined => {
    for (const item of items) {
      if (item.path === path) {
        if (!item.isEntity) return item.typeLabel;
        entityLabel = item.typeLabel;
      }
      const found = item.children ? walk(item.children) : undefined;
      if (found) return found;
    }
    return undefined;
  };
  for (const group of catalog.groups) {
    const found = walk(group.items);
    if (found) return found;
  }
  return entityLabel;
};
