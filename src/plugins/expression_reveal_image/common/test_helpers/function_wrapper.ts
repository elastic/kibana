/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { ExpressionRevealImageFunction } from '../types';

// It takes a function spec and passes in default args into the spec fn
export const functionWrapper = (fnSpec: () => ExpressionRevealImageFunction, mockReduxStore) => {
  const spec = fnSpec();
  const defaultArgs = mapValues(spec.args, (argSpec) => {
    return argSpec.default;
  });

  return (context, args, handlers) =>
    spec.fn(context, { ...defaultArgs, ...args }, handlers, mockReduxStore);
};
