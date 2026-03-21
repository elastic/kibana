import type { RouteValidationFunction } from '@kbn/core/server';
import type { Type, ValidationError } from 'io-ts';
export declare const createRouteValidationFunction: <DecodedValue, EncodedValue, InputValue>(runtimeType: Type<DecodedValue, EncodedValue, InputValue>) => RouteValidationFunction<DecodedValue>;
export declare const formatErrors: (errors: ValidationError[]) => string;
