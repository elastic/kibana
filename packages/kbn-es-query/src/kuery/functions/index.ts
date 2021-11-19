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
import { KQL_FUNCTION_NAME_AND } from './and';
import { KQL_FUNCTION_NAME_OR } from './or';
import { KQL_FUNCTION_NAME_RANGE } from './range';
import { KQL_FUNCTION_NAME_EXISTS } from './exists';
import { KQL_FUNCTION_NAME_IS } from './is';
import { KQL_FUNCTION_NAME_NESTED } from './nested';
import { KQL_FUNCTION_NAME_NOT } from './not';

export {
  KQL_FUNCTION_NAME_AND,
  KQL_FUNCTION_NAME_EXISTS,
  KQL_FUNCTION_NAME_IS,
  KQL_FUNCTION_NAME_NESTED,
  KQL_FUNCTION_NAME_NOT,
  KQL_FUNCTION_NAME_OR,
  KQL_FUNCTION_NAME_RANGE,
};

export const functions = {
  [KQL_FUNCTION_NAME_AND]: and,
  [KQL_FUNCTION_NAME_EXISTS]: exists,
  [KQL_FUNCTION_NAME_IS]: is,
  [KQL_FUNCTION_NAME_NESTED]: nested,
  [KQL_FUNCTION_NAME_NOT]: not,
  [KQL_FUNCTION_NAME_OR]: or,
  [KQL_FUNCTION_NAME_RANGE]: range,
};
