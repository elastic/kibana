/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { Context, Errors, IntersectionType, Type, UnionType, ValidationError } from 'io-ts';

type ErrorFactory = (message: string) => Error;

const getErrorPath = ([first, ...rest]: Context): string[] => {
  if (typeof first === 'undefined') {
    return [];
  } else if (first.type instanceof IntersectionType) {
    const [, ...next] = rest;
    return getErrorPath(next);
  } else if (first.type instanceof UnionType) {
    const [, ...next] = rest;
    return [first.key, ...getErrorPath(next)];
  }

  return [first.key, ...getErrorPath(rest)];
};

const getErrorType = ({ context }: ValidationError) =>
  context[context.length - 1]?.type?.name ?? 'unknown';

const formatError = (error: ValidationError) =>
  error.message ??
  `in ${getErrorPath(error.context).join('/')}: ${JSON.stringify(
    error.value
  )} does not match expected type ${getErrorType(error)}`;

export const formatErrors = (errors: ValidationError[]) =>
  `Failed to validate: \n${errors.map((error) => `  ${formatError(error)}`).join('\n')}`;

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: Errors) => {
  throw createError(formatErrors(errors));
};

export const decodeOrThrow =
  <DecodedValue, EncodedValue, InputValue>(
    runtimeType: Type<DecodedValue, EncodedValue, InputValue>,
    createError: ErrorFactory = createPlainError
  ) =>
  (inputValue: InputValue) =>
    pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));
