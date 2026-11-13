/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, parseDocument } from 'yaml';
import type { StepFormField } from './step_form_schema';
import { isEmptyFieldValue } from './step_form_schema';

/**
 * Writes one form-owned key back into the fragment. Only that key changes —
 * comments, unknown keys and Liquid expressions elsewhere are untouched.
 */
export const writeFragmentValue = (
  fragment: string,
  field: StepFormField,
  value: unknown,
  indent: number
): string => {
  const doc = parseDocument(fragment);
  if (!isMap(doc.contents)) return fragment;
  const path = [...field.path];
  // An empty string is the expression-mode sentinel for boolean/number fields —
  // don't delete it; keep the key so the UI stays in expression mode, unless the field opts out (`deleteWhenEmpty`).
  if (isEmptyFieldValue(value) && (value !== '' || field.deleteWhenEmpty) && !field.required) {
    // Nothing to delete when the key — or an ancestor mapping like `with` —
    // is absent: unlike `setIn`, `deleteIn` throws on a missing intermediate
    // node instead of treating it as a no-op.
    if (doc.hasIn(path)) {
      doc.deleteIn(path);
    }
  } else {
    doc.setIn(path, value);
  }
  return doc.toString({ indent, lineWidth: 0 });
};

/** The indent the text already uses (its first indented line), so a write keeps the style. */
export const detectIndent = (yaml: string): number => {
  for (const line of yaml.split('\n')) {
    const match = line.match(/^( +)\S/);
    if (match) return match[1].length;
  }
  return 2;
};
