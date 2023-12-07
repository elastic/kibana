/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const toNumberRt = new t.Type<number, number, unknown>(
  'ToNumber',
  t.number.is,
  (input, context) => {
    const number = Number(input);
    return !isNaN(number) ? t.success(number) : t.failure(input, context);
  },
  t.identity
);
