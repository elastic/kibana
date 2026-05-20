import type { ExpressionType } from './expression_type';
export type ExpressionValueUnboxed = any;
export type ExpressionValueBoxed<Type extends string = string, Value extends object = object> = {
    type: Type;
} & Value;
export type ExpressionValue = ExpressionValueUnboxed | ExpressionValueBoxed;
export type ExpressionValueConverter<I extends ExpressionValue, O extends ExpressionValue> = (input: I, availableTypes: Record<string, ExpressionType>) => O;
/**
 * A generic type which represents a custom Expression Type Definition that's
 * registered to the Interpreter.
 */
export interface ExpressionTypeDefinition<Name extends string, Value extends ExpressionValueUnboxed | ExpressionValueBoxed, SerializedType = undefined> {
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
