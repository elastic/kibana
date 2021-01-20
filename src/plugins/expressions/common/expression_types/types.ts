/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type ExpressionValueUnboxed = any;

export type ExpressionValueBoxed<Type extends string = string, Value extends object = object> = {
  type: Type;
} & Value;

export type ExpressionValue = ExpressionValueUnboxed | ExpressionValueBoxed;

export type ExpressionValueConverter<I extends ExpressionValue, O extends ExpressionValue> = (
  input: I,
  availableTypes: Record<string, any>
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
  validate?: (type: any) => void | Error;
  serialize?: (type: Value) => SerializedType;
  deserialize?: (type: SerializedType) => Value;
  // TODO: Update typings for the `availableTypes` parameter once interfaces for this
  // have been added elsewhere in the interpreter.
  from?: {
    [type: string]: ExpressionValueConverter<any, Value>;
  };
  to?: {
    [type: string]: ExpressionValueConverter<Value, any>;
  };
  help?: string;
}

export type AnyExpressionTypeDefinition = ExpressionTypeDefinition<any, any, any>;
