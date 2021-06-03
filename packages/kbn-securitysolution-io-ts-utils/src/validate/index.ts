/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fold, Either, mapLeft } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { fromEither, TaskEither } from 'fp-ts/lib/TaskEither';
import * as t from 'io-ts';
import { exactCheck } from '../exact_check';
import { formatErrors } from '../format_errors';

export const validate = <T extends t.Mixed>(
  obj: object,
  schema: T
): [t.TypeOf<T> | null, string | null] => {
  const decoded = schema.decode(obj);
  const checked = exactCheck(obj, decoded);
  const left = (errors: t.Errors): [T | null, string | null] => [
    null,
    formatErrors(errors).join(','),
  ];
  const right = (output: T): [T | null, string | null] => [output, null];
  return pipe(checked, fold(left, right));
};

export const validateNonExact = <T extends t.Mixed>(
  obj: unknown,
  schema: T
): [t.TypeOf<T> | null, string | null] => {
  const decoded = schema.decode(obj);
  const left = (errors: t.Errors): [T | null, string | null] => [
    null,
    formatErrors(errors).join(','),
  ];
  const right = (output: T): [T | null, string | null] => [output, null];
  return pipe(decoded, fold(left, right));
};

export const validateEither = <T extends t.Mixed, A extends unknown>(
  schema: T,
  obj: A
): Either<Error, A> =>
  pipe(
    obj,
    (a) => schema.validate(a, t.getDefaultContext(schema.asDecoder())),
    mapLeft((errors) => new Error(formatErrors(errors).join(',')))
  );

export const validateTaskEither = <T extends t.Mixed, A extends unknown>(
  schema: T,
  obj: A
): TaskEither<Error, A> => fromEither(validateEither(schema, obj));
