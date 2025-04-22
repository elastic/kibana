/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstTimeseriesCommand, ESQLMessage } from '@kbn/esql-ast';
import { ESQLFunction } from '@kbn/esql-ast/src/types';
import {
  isAggFunction,
  isFunctionOperatorParam,
  isMaybeAggFunction,
} from '../../../shared/helpers';
import { ReferenceMaps } from '../../types';
import { isFunctionItem, isLiteralItem } from '../../../..';
import { validateSources } from '../../validation';

/**
 * Validates the TIMESERIES source command:
 *
 *     TS <sources>
 */
export const validate = (
  command: ESQLAstTimeseriesCommand,
  references: ReferenceMaps
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const { sources } = command;

  // TS <sources> ...
  messages.push(...validateSources(sources, references));

  return messages;
};

/**
 * Validate that a function is an aggregate function or that all children
 * recursively terminate at either a literal or an aggregate function.
 */
const isFunctionAggClosed = (fn: ESQLFunction): boolean =>
  isMaybeAggFunction(fn) || areFunctionArgsAggClosed(fn);

const areFunctionArgsAggClosed = (fn: ESQLFunction): boolean =>
  fn.args.every((arg) => isLiteralItem(arg) || (isFunctionItem(arg) && isFunctionAggClosed(arg))) ||
  isFunctionOperatorParam(fn);

/**
 * Looks for first nested aggregate function in an aggregate function, recursively.
 */
const findNestedAggFunctionInAggFunction = (agg: ESQLFunction): ESQLFunction | undefined => {
  for (const arg of agg.args) {
    if (isFunctionItem(arg)) {
      return isMaybeAggFunction(arg) ? arg : findNestedAggFunctionInAggFunction(arg);
    }
  }
};

/**
 * Looks for first nested aggregate function in another aggregate a function,
 * recursively.
 *
 * @param fn Function to check for nested aggregate functions.
 * @param parentIsAgg Whether the parent function of `fn` is an aggregate function.
 * @returns The first nested aggregate function in `fn`, or `undefined` if none is found.
 */
const findNestedAggFunction = (
  fn: ESQLFunction,
  parentIsAgg: boolean = false
): ESQLFunction | undefined => {
  if (isMaybeAggFunction(fn)) {
    return parentIsAgg ? fn : findNestedAggFunctionInAggFunction(fn);
  }

  for (const arg of fn.args) {
    if (isFunctionItem(arg)) {
      const nestedAgg = findNestedAggFunction(arg, parentIsAgg || isAggFunction(fn));
      if (nestedAgg) return nestedAgg;
    }
  }
};
