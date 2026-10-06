/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionType } from './expression_type';
export type ExpressionValueUnboxed = any;
export type ExpressionValueBoxed<Type extends string = string, Value extends object = object> = {
  type: Type;
} & Value;
export type ExpressionValue = ExpressionValueUnboxed | ExpressionValueBoxed;
export type ExpressionValueConverter<I extends ExpressionValue, O extends ExpressionValue> = (
  input: I,
  availableTypes: Record<string, ExpressionType>
) => O;
/**
 * A generic type which represents a custom Expression Type Definition that's
 * registered to the Interpreter.
 */
export interface ExpressionTypeDefinition<
  Name extends string,
  Value extends ExpressionValueUnboxed | ExpressionValueBoxed,
  SerializedType = undefined
> {
  name: Name;
  namespace?: string;
  validate?(type: unknown): void | Error;
  serialize?(type: Value): SerializedType;
  deserialize?(type: SerializedType): Value;
  from?: {
    [type: string]: ExpressionValueConverter<ExpressionValue, Value>;
  };
  to?: {
    [type: string]: ExpressionValueConverter<Value, ExpressionValue>;
  };
  help?: string;
}
export type AnyExpressionTypeDefinition = ExpressionTypeDefinition<string, any, any>;
