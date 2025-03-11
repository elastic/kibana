/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

/**
 * Converts string value to a Typescript enum
 *  - "foo" -> MyEnum.foo
 *
 * @param name Enum name
 * @param originalEnum Typescript enum
 * @returns Codec
 */
export function enumeration<EnumType extends string>(
  name: string,
  originalEnum: Record<string, EnumType>
): t.Type<EnumType, EnumType, unknown> {
  const isEnumValue = (input: unknown): input is EnumType =>
    Object.values<unknown>(originalEnum).includes(input);

  return new t.Type<EnumType>(
    name,
    isEnumValue,
    (input, context) => (isEnumValue(input) ? t.success(input) : t.failure(input, context)),
    t.identity
  );
}
