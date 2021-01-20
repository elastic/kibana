/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { access } from './access';
import { add } from './add';
import { error } from './error';
import { introspectContext } from './introspect_context';
import { mult } from './mult';
import { sleep } from './sleep';
import { AnyExpressionFunctionDefinition } from '../../expression_functions';

export const functionTestSpecs: AnyExpressionFunctionDefinition[] = [
  access,
  add,
  error,
  introspectContext,
  mult,
  sleep,
];
