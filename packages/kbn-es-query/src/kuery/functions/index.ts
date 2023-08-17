/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as is from './is';
import * as and from './and';
import * as or from './or';
import * as not from './not';
import * as range from './range';
import * as exists from './exists';
import * as nested from './nested';

export { KQL_FUNCTION_AND } from './and';
export { KQL_FUNCTION_EXISTS } from './exists';
export { KQL_FUNCTION_IS } from './is';
export { KQL_FUNCTION_NESTED } from './nested';
export { KQL_FUNCTION_NOT } from './not';
export { KQL_FUNCTION_OR } from './or';
export { KQL_FUNCTION_RANGE } from './range';

export const functions = {
  is,
  and,
  or,
  not,
  range,
  exists,
  nested,
};
