/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstMetricsCommand, ESQLCommand, ESQLMessage, isIdentifier, walk } from '@kbn/esql-ast';
import { ESQLAstField, ESQLAstItem, ESQLFunction } from '@kbn/esql-ast/src/types';
import {
  isAggFunction,
  isFunctionOperatorParam,
  isMaybeAggFunction,
} from '../../../shared/helpers';
import { FunctionDefinitionTypes } from '../../../definitions/types';
import { ReferenceMaps } from '../../types';
import {
  getFunctionDefinition,
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isLiteralItem,
} from '../../../..';
import { errors } from '../../errors';
import { validateFunction } from '../../function_validation';
import { validateColumnForCommand, validateSources } from '../../validation';

/**
 * Validates the METRICS source command:
 *
 *     METRICS <sources> [ <aggregates> [ BY <grouping> ]]
 */
export const validate = (
  command: ESQLAstMetricsCommand,
  references: ReferenceMaps
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const { sources, aggregates, grouping } = command;

  // METRICS <sources> ...
  messages.push(...validateSources(command, sources, references));

  // ... <aggregates> ...
  if (aggregates && aggregates.length) {
    messages.push(...validateAggregates(command, aggregates, references));

    // ... BY <grouping>
    if (grouping && grouping.length) {
      messages.push(...validateByGrouping(grouping, 'metrics', references, true));
    }
  }

  return messages;
};

/**
 * Validates aggregates fields: `... <aggregates> ...`.
 */
const validateAggregates = (
  command: ESQLCommand,
  aggregates: ESQLAstField[],
  references: ReferenceMaps
) => {
  const messages: ESQLMessage[] = [];

  // Should never happen.
  if (!aggregates.length) {
    messages.push(errors.unexpected(command.location));
    return messages;
  }

  let hasMissingAggregationFunctionError = false;

  for (const aggregate of aggregates) {
    if (isFunctionItem(aggregate)) {
      messages.push(
        ...validateFunction({
          fn: aggregate,
          parentCommand: command.name,
          parentOption: undefined,
          references,
        })
      );

      let hasAggregationFunction = false;

      walk(aggregate, {
        visitFunction: (fn) => {
          const definition = getFunctionDefinition(fn.name);
          if (!definition) return;
          if (definition.type === FunctionDefinitionTypes.AGG) hasAggregationFunction = true;
        },
      });

      if (!hasAggregationFunction) {
        hasMissingAggregationFunctionError = true;
        messages.push(errors.noAggFunction(command, aggregate));
      }
    } else if (isColumnItem(aggregate) || isIdentifier(aggregate)) {
      messages.push(errors.unknownAggFunction(aggregate));
    } else {
      // Should never happen.
    }
  }

  if (hasMissingAggregationFunctionError) {
    return messages;
  }

  for (const aggregate of aggregates) {
    if (isFunctionItem(aggregate)) {
      const fn = isAssignment(aggregate) ? aggregate.args[1] : aggregate;
      if (isFunctionItem(fn) && !isFunctionAggClosed(fn)) {
        messages.push(errors.expressionNotAggClosed(command, fn));
      }
    }
  }

  if (messages.length) {
    return messages;
  }

  for (const aggregate of aggregates) {
    if (isFunctionItem(aggregate)) {
      const aggInAggFunction = findNestedAggFunction(aggregate);
      if (aggInAggFunction) {
        messages.push(errors.aggInAggFunction(aggInAggFunction));
        break;
      }
    }
  }

  return messages;
};

/**
 * Validates grouping fields of the BY clause: `... BY <grouping>`.
 */
const validateByGrouping = (
  fields: ESQLAstItem[],
  commandName: string,
  referenceMaps: ReferenceMaps,
  multipleParams: boolean
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  for (const field of fields) {
    if (!Array.isArray(field)) {
      if (!multipleParams) {
        if (isColumnItem(field)) {
          messages.push(...validateColumnForCommand(field, commandName, referenceMaps));
        }
      } else {
        if (isColumnItem(field)) {
          messages.push(...validateColumnForCommand(field, commandName, referenceMaps));
        }
        if (isFunctionItem(field)) {
          messages.push(
            ...validateFunction({
              fn: field,
              parentCommand: commandName,
              parentOption: 'by',
              references: referenceMaps,
            })
          );
        }
      }
    }
  }
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
