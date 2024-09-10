/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { formatErrors } from '../format_errors';

/*
 * FUNFACT: These don't have tests as these are used within test utilities. However, I could see
 * someone adding tests. If one day we see these escape tests, then they should have unit tests.
 */

interface Message<T> {
  errors: t.Errors;
  schema: T | {};
}

const onLeft = <T>(errors: t.Errors): Message<T> => {
  return { schema: {}, errors };
};

const onRight = <T>(schema: T): Message<T> => {
  return {
    schema,
    errors: [],
  };
};

export const foldLeftRight = fold(onLeft, onRight);

/**
 * Convenience utility to keep the error message handling within tests to be
 * very concise.
 * @param validation The validation to get the errors from
 */
export const getPaths = <A>(validation: t.Validation<A>): string[] => {
  return pipe(
    validation,
    fold(
      (errors) => formatErrors(errors),
      () => ['no errors']
    )
  );
};

/**
 * Convenience utility to remove text appended to links by EUI
 */
export const removeExternalLinkText = (str: string) =>
  str.replace(/\(opens in a new tab or window\)/g, '');
