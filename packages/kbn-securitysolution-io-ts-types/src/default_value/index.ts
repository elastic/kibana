/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import type { Either } from 'fp-ts/lib/Either';

/**
 * Creates a schema that sets a default value if the input value is not specified.
 *
 * @param valueSchema Base schema of a value.
 * @param value Default value to set.
 * @param name (Optional) Name of the resulting schema.
 */
export const defaultValue = <TValue>(
  valueSchema: t.Type<TValue>,
  value: TValue,
  name?: string
): t.Type<TValue> => {
  return new t.Type<TValue>(
    name ?? `DefaultValue<${valueSchema.name}>`,
    valueSchema.is,
    (input, context): Either<t.Errors, TValue> =>
      input == null ? t.success(value) : valueSchema.validate(input, context),
    t.identity
  );
};
