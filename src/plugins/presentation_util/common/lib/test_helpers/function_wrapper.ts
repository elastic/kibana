/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnwrapPromiseOrReturn } from '@kbn/utility-types';
import { mapValues } from 'lodash';
import {
  ExpressionValueBoxed,
  typeSpecs,
  ExpressionFunctionDefinition,
} from '../../../../expressions/common';

type DefaultFnResultType = typeof typeSpecs[number] &
  ExpressionFunctionDefinition<
    string,
    any,
    Record<string, any>,
    ExpressionValueBoxed<any, any> | Promise<ExpressionValueBoxed<any, any>>
  >;

type FnType = () => DefaultFnResultType | Promise<DefaultFnResultType>;

// It takes a function spec and passes in default args into the spec fn
export const functionWrapper = async (
  fnSpec: FnType
): Promise<UnwrapPromiseOrReturn<ReturnType<FnType>>['fn']> => {
  const spec = await fnSpec();
  const defaultArgs = mapValues(spec.args, (argSpec) => {
    return argSpec.default;
  });

  return (context, args, handlers) => spec.fn(context, { ...defaultArgs, ...args }, handlers);
};
