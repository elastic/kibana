import type { Errors, Type, ValidationError } from 'io-ts';
type ErrorFactory = (message: string) => Error;
export declare const formatErrors: (errors: ValidationError[]) => string;
export declare const createPlainError: (message: string) => Error;
export declare const throwErrors: (createError: ErrorFactory) => (errors: Errors) => never;
export declare const decodeOrThrow: <DecodedValue, EncodedValue, InputValue>(runtimeType: Type<DecodedValue, EncodedValue, InputValue>, createError?: ErrorFactory) => (inputValue: InputValue) => DecodedValue;
export {};
