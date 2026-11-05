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
import { formatValueReferenceToken } from './build_data_reference_catalog';

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
 * Applies the written-form rule to a value that may be anything: a whole reference keeps its
 * type (`${{ }}`), while a reference inside a sentence is text (`{{ }}`), because the value form
 * only works as the whole value.
 */
export const normalizeReferenceForm = (text: string): string => {
  const whole = parseWholeReference(text);
  if (whole) return whole.form === 'text' ? formatValueReferenceToken(whole.expression) : text;
  return text.includes('${{') ? text.replaceAll('${{', '{{') : text;
};

/**
 * Type label the catalog declares for a reference expression, or undefined when the catalog
 * doesn't know the path. Step entities and their undeclared `output` leaf share a path, so the
 * leaf (the more specific label) wins.
 */
export const lookupReferenceTypeLabel = (
  catalog: DataReferenceCatalog,
  expression: string
): string | undefined => {
  const path = expression.split('|')[0].trim();
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
