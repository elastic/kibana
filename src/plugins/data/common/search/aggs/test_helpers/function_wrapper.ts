/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import {
  AnyExpressionFunctionDefinition,
  ExpressionFunctionDefinition,
  ExecutionContext,
} from '@kbn/expressions-plugin/common';

/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 *
 * Similar to the test helper used in Expressions & Canvas,
 * however in this case we are ignoring the input & execution
 * context, as they are not applicable to the agg type
 * expression functions.
 */
export const functionWrapper = <T extends AnyExpressionFunctionDefinition>(spec: T) => {
  const defaultArgs = mapValues(spec.args, (argSpec) => argSpec.default);
  return (
    args: T extends ExpressionFunctionDefinition<
      infer Name,
      infer Input,
      infer Arguments,
      infer Output,
      infer Context
    >
      ? Arguments
      : never
  ) => spec.fn(null, { ...defaultArgs, ...args }, {} as ExecutionContext);
};
