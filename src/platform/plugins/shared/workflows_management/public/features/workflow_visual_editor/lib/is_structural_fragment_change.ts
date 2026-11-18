/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { STEP_CHILD_CONTAINER_KEYS } from '@kbn/workflows';
import { parseStepFragment } from './parse_step_fragment';

/**
 * Step keys whose change alters what the canvas draws: the node id (`name`), its kind (`type`), and
 * every place the step can hold child steps (`steps`, `else`, cases, branches, `default` and the
 * error ports), which `@kbn/workflows` lists once. The list errs toward flushing: a key missing here
 * costs a late canvas repaint (the computation debounce), never a lost edit.
 */
const STRUCTURAL_STEP_KEYS = ['name', 'type', ...STEP_CHILD_CONTAINER_KEYS] as const;

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
  const before = parseStepFragment(previous).js;
  const after = parseStepFragment(next).js;
  if (!before || !after) return true;
  return STRUCTURAL_STEP_KEYS.some((key) => !isEqual(before[key], after[key]));
};
