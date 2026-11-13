/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { parseDocument } from 'yaml';

/**
 * Step keys whose change alters what the canvas draws: the node id (`name`), its kind (`type`), the
 * nested bodies, the case and branch edge labels, and the error port (`on-failure`). The list errs
 * toward flushing: a key missing here costs a late canvas repaint (the computation debounce), never a
 * lost edit.
 */
const STRUCTURAL_STEP_KEYS = [
  'name',
  'type',
  'steps',
  'else',
  'default',
  'cases',
  'branches',
  'on-failure',
] as const;

const toStepMap = (fragment: string): Record<string, unknown> | undefined => {
  const doc = parseDocument(fragment);
  if (doc.errors.length > 0) return undefined;
  const value: unknown = doc.toJS();
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
};

/**
 * True when going from the previously applied step fragment to the next one changes the graph, so the
 * canvas must be recomputed in the same tick. False for edits to the step's own settings (`with`,
 * `if`, `timeout`, ...), which can wait for the computation debounce. A missing or unparseable
 * fragment counts as structural.
 */
export const isStructuralFragmentChange = (
  previous: string | null | undefined,
  next: string
): boolean => {
  if (previous === null || previous === undefined) return true;
  const before = toStepMap(previous);
  const after = toStepMap(next);
  if (!before || !after) return true;
  return STRUCTURAL_STEP_KEYS.some((key) => !isEqual(before[key], after[key]));
};
