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

export const functions = {
  is,
  and,
  or,
  not,
  range,
  exists,
  nested,
};
