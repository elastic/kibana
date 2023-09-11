/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const toBooleanRt = new t.Type<boolean, boolean, unknown>(
  'ToBoolean',
  t.boolean.is,
  (input) => {
    let value: boolean;
    if (typeof input === 'string') {
      value = input === 'true';
    } else {
      value = !!input;
    }

    return t.success(value);
  },
  t.identity
);
