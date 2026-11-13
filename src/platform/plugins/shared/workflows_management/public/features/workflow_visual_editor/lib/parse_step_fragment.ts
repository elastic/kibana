/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { isMap, parseDocument } from 'yaml';
import { readPath } from './step_form_schema';

/** A step YAML fragment, parsed once: everything the panel reads from it comes from here. */
export interface ParsedStepFragment {
  /** The text it was parsed from. */
  readonly text: string;
  readonly hasErrors: boolean;
  /** The first YAML error, when there is one. */
  readonly error: string | undefined;
  /** The text as plain data, whatever it holds; for comparing two drafts. */
  readonly data: unknown;
  /** A mapping without YAML errors: the only fragment the form can edit. */
  readonly valid: boolean;
  /** The step as plain data; undefined unless `valid`. */
  readonly js: Record<string, unknown> | undefined;
  /**
   * The value at `path`, as plain data. Reads whatever mapping the parser recovered, even from
   * text with errors. The same value comes back on every read, so it can be compared by identity.
   */
  readonly read: (path: readonly string[]) => unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseStepFragment = (text: string): ParsedStepFragment => {
  const doc = parseDocument(text);
  const hasErrors = doc.errors.length > 0;
  const data: unknown = doc.toJS();
  const mapping = isMap(doc.contents) && isRecord(data) ? data : undefined;
  const valid = !hasErrors && mapping !== undefined;
  return {
    text,
    hasErrors,
    error: doc.errors[0]?.message,
    data,
    valid,
    js: valid ? mapping : undefined,
    read: (path) => (mapping ? readPath(mapping, path) : undefined),
  };
};

/**
 * True when the draft differs from the one the panel opened with. Compares what the YAML says, not
 * its text (comments, spacing and key order are not changes), unless either has errors to compare.
 */
export const isStepFragmentDirty = (
  draft: ParsedStepFragment,
  applied: ParsedStepFragment
): boolean => {
  if (draft.text === applied.text) return false;
  if (draft.hasErrors || applied.hasErrors) return true;
  return !isEqual(draft.data, applied.data);
};
