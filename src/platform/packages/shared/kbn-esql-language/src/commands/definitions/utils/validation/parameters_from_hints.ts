/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunctionExpression } from '@elastic/esql';
import type { ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
import { FunctionDefinitionTypes, type ESQLMessage } from '../../types';
import { errors } from '../errors';
import { getFunctionDefinition } from '../functions';
import { removeInlineCasts } from './utils';

/**
 * Per-kind validators for `hint.kind`-marked parameters. Each entry owns
 * its position fully — both the custom error reporting AND the decision
 * whether to invoke the validator's standard recursive child validation
 * (with or without inheriting the parent's validation context).
 *
 * The validator core (`function.ts`) is unaware of any specific kind value;
 * it just looks an entry up and calls `validateChild`. Adding support for
 * a new kind means adding one entry below.
 */
export interface KindBasedValidator {
  validateChild(
    arg: ESQLAstItem,
    parentFn: ESQLFunction,
    paramName: string,
    helpers: {
      /**
       * Run the validator's standard recursive validation on this arg
       * (only relevant when arg is a function call). `inheritsParentContext`
       * defaults to true: the child sees the parent's scope, matching the
       * validator's normal recursion. Pass `false` to validate the child as
       * a fresh scope, exempt from rules that depend on parent context
       * (today: the "no nested aggregations" rule).
       */
      runStandardChildValidation: (options?: {
        inheritsParentContext?: boolean;
      }) => ESQLMessage[];
    }
  ): ESQLMessage[];
}

export const kindBasedValidators: Partial<Record<string, KindBasedValidator>> = {
  aggregation: {
    validateChild: (arg, parentFn, paramName, { runStandardChildValidation }) => {
      const out: ESQLMessage[] = [];
      const stripped = removeInlineCasts(arg);
      const isAggCall =
        isFunctionExpression(stripped) &&
        getFunctionDefinition(stripped.name)?.type === FunctionDefinitionTypes.AGG;

      if (!isAggCall) {
        out.push(errors.expectedAggregationArgument(parentFn, paramName));
      }

      // If the arg is a function call, validate it as a fresh scope:
      // at this position the parent-aggregation context must not propagate.
      if (isFunctionExpression(stripped)) {
        out.push(...runStandardChildValidation({ inheritsParentContext: false }));
      }

      return out;
    },
  },
};
