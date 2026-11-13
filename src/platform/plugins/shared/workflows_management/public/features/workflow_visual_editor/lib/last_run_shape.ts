/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isPlainObject } from './is_plain_object';

export interface StepOutputReference {
  readonly stepName: string;
  /** Segments after `output`; list positions are digits (`hits.hits.0` gives `['hits', 'hits', '0']`). */
  readonly path: readonly string[];
}

/** Exactly `steps.<step>.output` followed by plain dotted segments; filters, brackets and operators are not. */
const STEP_OUTPUT_REFERENCE = /^steps\.([^.\s|[\]]+)\.output((?:\.[^.\s|[\]]+)*)$/;

export const parseStepOutputReference = (expression: string): StepOutputReference | undefined => {
  const match = STEP_OUTPUT_REFERENCE.exec(expression.trim());
  if (!match) return undefined;
  const [, stepName, rest] = match;
  return { stepName, path: rest ? rest.slice(1).split('.') : [] };
};

const resolvePath = (output: unknown, path: readonly string[]): { value: unknown } | undefined => {
  let current = output;
  for (const segment of path) {
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      if (Number(segment) >= current.length) return undefined;
      current = current[Number(segment)];
    } else if (isPlainObject(current) && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current === undefined ? undefined : { value: current };
};

/**
 * What a step's last output holds at `path`, as a short phrase: its type and, for a list or
 * record, how many entries. Never the values. Undefined when the path doesn't resolve.
 */
export const describeLastRunShape = (
  output: unknown,
  path: readonly string[]
): string | undefined => {
  const resolved = resolvePath(output, path);
  if (!resolved) return undefined;
  const { value } = resolved;
  if (Array.isArray(value)) {
    return i18n.translate('workflows.stepConfigPanel.lastRunShape.list', {
      defaultMessage: 'list, {count, plural, one {# item} other {# items}}',
      values: { count: value.length },
    });
  }
  if (isPlainObject(value)) {
    return i18n.translate('workflows.stepConfigPanel.lastRunShape.record', {
      defaultMessage: 'record, {count, plural, one {# field} other {# fields}}',
      values: { count: Object.keys(value).length },
    });
  }
  return value === null ? 'null' : typeof value;
};
