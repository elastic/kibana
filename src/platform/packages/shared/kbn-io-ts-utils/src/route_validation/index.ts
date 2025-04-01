/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteValidationFunction } from '@kbn/core/server';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { Context, Errors, IntersectionType, Type, UnionType, ValidationError } from 'io-ts';

type ValdidationResult<Value> = ReturnType<RouteValidationFunction<Value>>;

export const createRouteValidationFunction =
  <DecodedValue, EncodedValue, InputValue>(
    runtimeType: Type<DecodedValue, EncodedValue, InputValue>
  ): RouteValidationFunction<DecodedValue> =>
  (inputValue, { badRequest, ok }) =>
    pipe(
      runtimeType.decode(inputValue),
      fold<Errors, DecodedValue, ValdidationResult<DecodedValue>>(
        (errors: Errors) => badRequest(formatErrors(errors)),
        (result: DecodedValue) => ok(result)
      )
    );

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
