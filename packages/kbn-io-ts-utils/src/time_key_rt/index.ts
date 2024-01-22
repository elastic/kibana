/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';
import moment from 'moment';
import { pipe } from 'fp-ts/lib/pipeable';
import { chain } from 'fp-ts/lib/Either';

const NANO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3,9}Z$/;

export const DateFromStringOrNumber = new rt.Type<string, number | string>(
  'DateFromStringOrNumber',
  (input): input is string => typeof input === 'string',
  (input, context) => {
    if (typeof input === 'string') {
      return NANO_DATE_PATTERN.test(input) ? rt.success(input) : rt.failure(input, context);
    }
    return pipe(
      rt.number.validate(input, context),
      chain((timestamp) => {
        const momentValue = moment(timestamp);
        return momentValue.isValid()
          ? rt.success(momentValue.toISOString())
          : rt.failure(timestamp, context);
      })
    );
  },
  String
);

export const minimalTimeKeyRT = rt.type({
  time: DateFromStringOrNumber,
  tiebreaker: rt.number,
});
export type MinimalTimeKey = rt.TypeOf<typeof minimalTimeKeyRT>;

const timeKeyRT = rt.intersection([
  minimalTimeKeyRT,
  rt.partial({
    gid: rt.string,
    fromAutoReload: rt.boolean,
  }),
]);
export type TimeKey = rt.TypeOf<typeof timeKeyRT>;

export interface UniqueTimeKey extends TimeKey {
  gid: string;
}
