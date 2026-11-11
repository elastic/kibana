/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionHandler } from '@kbn/custom-app-registry';
import type { RunWorkflowAction } from '../../../common/custom_app/run_workflow/manifest';

type PlainValue = string | number | boolean | null;

const isPlainValue = (value: unknown): value is PlainValue =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

/** A column holds a value, or several, as ES|QL does; anything else is not something to hand over. */
const toWorkflowInput = (value: unknown): PlainValue | readonly PlainValue[] | undefined => {
  if (isPlainValue(value)) return value;
  if (Array.isArray(value) && value.every(isPlainValue)) return value;
  return undefined;
};

/**
 * Resolves what the workflow is handed, from the row that was clicked and the values of the app,
 * and asks the app to run it: that takes the person's say, and the network.
 */
export const runWorkflowHandler: ActionHandler<RunWorkflowAction> = (
  action,
  { input, state, drop, request }
) => {
  const inputs: Record<string, PlainValue | readonly PlainValue[]> = {};
  // One input that cannot be had is reason enough not to run the workflow at all: it would be
  // handed less than it was written to be given.
  const missing = Object.entries(action.inputs).find(([name, source]) => {
    let resolved: unknown;
    if (typeof source !== 'object') {
      resolved = source;
    } else if ('fromColumn' in source) {
      if (!input.row || !(source.fromColumn in input.row)) {
        drop(`Column "${source.fromColumn}" is not in the row`);
        return true;
      }
      resolved = input.row[source.fromColumn];
    } else {
      resolved = state[source.fromState];
    }

    const value = toWorkflowInput(resolved);
    if (value === undefined) {
      drop(`The input "${name}" of "${action.workflow}" is not a plain value`);
      return true;
    }
    inputs[name] = value;
    return false;
  });
  if (!missing) request({ workflow: action.workflow, inputs });
};
