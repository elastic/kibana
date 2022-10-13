/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export const LimitedSizeArray = <C extends t.Mixed>({
  codec,
  minSize,
  maxSize,
  name = `LimitedSizeArray<${codec.name}>`,
}: {
  codec: C;
  minSize?: number;
  maxSize?: number;
  name?: string;
}) => {
  const arrType = t.array(codec);
  type ArrType = t.TypeOf<typeof arrType>;
  return new t.Type<ArrType, ArrType, unknown>(
    name,
    arrType.is,
    (input, context): Either<t.Errors, ArrType> => {
      if (
        Array.isArray(input) &&
        ((minSize && input.length < minSize) || (maxSize && input.length > maxSize))
      ) {
        return t.failure(
          input,
          context,
          `Array size (${input.length}) is out of bounds: min: ${
            minSize ?? 'not specified'
          }, max: ${maxSize ?? 'not specified'}`
        );
      } else {
        return arrType.validate(input, context);
      }
    },
    t.identity
  );
};
