/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as rt from 'io-ts';
import dateMath from '@kbn/datemath';
import { chain } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

const isValidDatemath = (value: string): boolean => {
  const parsedValue = dateMath.parse(value);
  return !!(parsedValue && parsedValue.isValid());
};

export const datemathStringRt = new rt.Type<string, string, unknown>(
  'datemath',
  rt.string.is,
  (value, context) =>
    pipe(
      rt.string.validate(value, context),
      chain((stringValue) =>
        isValidDatemath(stringValue) ? rt.success(stringValue) : rt.failure(stringValue, context)
      )
    ),
  String
);
