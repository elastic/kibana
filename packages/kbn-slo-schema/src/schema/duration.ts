/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

import { Duration, DurationUnit } from '../models/duration';

const durationType = new t.Type<Duration, string, unknown>(
  'Duration',
  (input: unknown): input is Duration => input instanceof Duration,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      try {
        const decoded = new Duration(
          parseInt(value.slice(0, -1), 10),
          value.slice(-1) as DurationUnit
        );
        return t.success(decoded);
      } catch (err) {
        return t.failure(input, context);
      }
    }),
  (duration: Duration): string => duration.format()
);

export { durationType };
