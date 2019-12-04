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

/* eslint-disable max-classes-per-file */

import { ValidationError, Type } from '@kbn/config-schema';
import { RouteValidationError } from './validator_error';

/**
 * Allowed returned format of the custom validate function
 * @public
 */
export type RouteValidateFunctionReturn<T> =
  | {
      value: T;
      error?: never;
    }
  | {
      value?: never;
      error: RouteValidationError;
    };

/**
 * Custom validator class. If @kbn/config-schema is not a valid option in your plugin,
 * you can use this class to define your own validation logic.
 *
 * @public
 */
export class RouteValidator<T> {
  constructor(private readonly validationRule: (data: any) => RouteValidateFunctionReturn<T>) {}

  public validate(data: any, namespace?: string): T {
    let result: RouteValidateFunctionReturn<T>;
    try {
      result = this.validationRule(data);
    } catch (err) {
      result = { error: new RouteValidationError(err) };
    }

    if (result.error) {
      throw new ValidationError(result.error, namespace);
    }
    return result.value;
  }
}

/**
 * The common interface accepted as validate specs
 * (typically Type<T> from @kbn/config-schema or RouteValidator<T>)
 *
 * @internal
 */
export type RouteValidateSpecs<T = unknown> = Type<T> | RouteValidator<T>;

export type RouteValidatedType<T extends RouteValidateSpecs> = ReturnType<T['validate']>;

export function validate<T>(
  validationSpec: RouteValidateSpecs<T>,
  data: any,
  namespace?: string
): T {
  if (validationSpec instanceof Type) {
    return validationSpec.validate(data, {}, namespace);
  } else if (validationSpec instanceof RouteValidator) {
    return validationSpec.validate(data, namespace);
  } else {
    throw new ValidationError(
      new RouteValidationError(`The validation rule provided in the handler is not valid`),
      namespace
    );
  }
}
