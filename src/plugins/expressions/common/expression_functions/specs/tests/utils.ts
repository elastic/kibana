/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapValues } from 'lodash';
import { AnyExpressionFunctionDefinition } from '../../types';
import { ExecutionContext } from '../../../execution/types';

/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 */
export const functionWrapper = (spec: AnyExpressionFunctionDefinition) => {
  const defaultArgs = mapValues(spec.args, (argSpec) => argSpec.default);
  return (
    context: object | null,
    args: Record<string, any> = {},
    handlers: ExecutionContext = {} as ExecutionContext
  ) => spec.fn(context, { ...defaultArgs, ...args }, handlers);
};
