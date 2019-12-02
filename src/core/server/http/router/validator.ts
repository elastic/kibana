/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SchemaTypeError, ValidationError, ObjectType, Type, TypeOf } from '@kbn/config-schema';

/**
 * Error to return when the validation is not successful.
 * @public
 */
export class RouteValidationError extends SchemaTypeError {
  constructor(error: Error | string, path: string[] = []) {
    super(error, path);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RouteValidationError.prototype);
  }
}

/**
 * Allowed returned format of the custom validate function
 * @public
 */
export type RouteValidateFunctionReturn<T> =
  | {
      value: T;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: RouteValidationError;
    };

/**
 * Custom validate function (only if @kbn/config-schema is not a valid option in your plugin)
 * @public
 */
export type RouteValidateFunction<T> = (data: any) => RouteValidateFunctionReturn<T>;

export type TypeOfFunctionReturn<T extends RouteValidateFunction<unknown>> = NonNullable<
  ReturnType<T>['value']
>;

export type RouteValidateSpecs<T> = ObjectType | Type<T> | RouteValidateFunction<T>;
export type RouteValidatedType<T extends RouteValidateSpecs<unknown>> = T extends Type<unknown>
  ? TypeOf<T>
  : T extends RouteValidateFunction<unknown>
  ? TypeOfFunctionReturn<T>
  : never;

function validateFunction<T extends RouteValidateFunction<unknown>>(
  validationSpec: T,
  data: any,
  namespace?: string
): TypeOfFunctionReturn<typeof validationSpec> {
  let result: RouteValidateFunctionReturn<ReturnType<typeof validationSpec>['value']>;
  try {
    result = validationSpec(data);
  } catch (err) {
    result = { error: new RouteValidationError(err) };
  }

  if (result.error) {
    throw new ValidationError(result.error, namespace);
  }
  return result.value as TypeOfFunctionReturn<typeof validationSpec>;
}

export function validate<T>(
  validationSpec: RouteValidateSpecs<T>,
  data: any,
  namespace?: string
): T {
  if (typeof validationSpec === 'function') {
    return validateFunction(validationSpec, data, namespace);
  } else if (validationSpec instanceof Type) {
    return validationSpec.validate(data, {}, namespace);
  } else {
    throw new ValidationError(
      new RouteValidationError(`The validation rule provided in the handler is not valid`),
      namespace
    );
  }
}
