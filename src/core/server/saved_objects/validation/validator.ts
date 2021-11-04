/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationError, ObjectType, isConfigSchema } from '@kbn/config-schema';
import { SavedObjectAttributes } from '../../types';
import { SavedObjectsValidationError } from './validator_error';

/**
 * The custom validation function if @kbn/config-schema is not a valid solution for your specific plugin requirements.
 *
 * @example
 * The validation should look something like:
 * ```typescript
 * const myAttributesValidation: SavedObjectsValidationFunction = (data) => {
 *   if (typeof data.bar !== 'string') {
 *     throw new Error(`[bar]: expected value of type [string] but got [${typeof data.bar}]`);
 *   }
 * }
 * ```
 *
 * @public
 */
export type SavedObjectsValidationFunction<
  A extends SavedObjectAttributes = SavedObjectAttributes
> = (data: A) => void;

/**
 * Allowed property validation options: either @kbn/config-schema validations or custom validation functions.
 *
 * See {@link SavedObjectsValidationFunction} for custom validation.
 *
 * @public
 */
export type SavedObjectsValidationSpec<A extends SavedObjectAttributes> =
  | ObjectType
  | SavedObjectsValidationFunction<A>;

/**
 * A map of {@link SavedObjectsValidationSpec | validation specs} to be used for a given type.
 * The map's keys must be valid semver versions.
 *
 * Any time you change the schema of a {@link SavedObjectsType}, you should add a new entry
 * to this map for the Kibana version the change was introduced in.
 *
 * @example
 * ```typescript
 * const validationMap: SavedObjectValidationMap = {
 *   '1.0.0': schema.object({
 *     foo: schema.string(),
 *   }),
 *   '1.1.0': schema.object({
 *     foo: schema.oneOf([schema.string(), schema.boolean()]),
 *   }),
 *   '2.1.0': (data) => {
 *     if (typeof data.bar !== 'string') {
 *       throw new Error(`[bar]: expected value of type [string] but got [${typeof data.bar}]`);
 *     }
 *     if (typeof data.foo !== 'string' && typeof data.foo !== 'boolean') {
 *       throw new Error(`[foo]: expected value of type [string,boolean] but got [${typeof data.foo}]`);
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectsValidationMap<
  A extends SavedObjectAttributes = SavedObjectAttributes
> {
  [version: string]: SavedObjectsValidationSpec<A>;
}

/**
 * Helper class that takes a {@link SavedObjectsValidationMap} and runs validations for a
 * given type based on the provided Kibana version.
 *
 * @internal
 */
export class SavedObjectsTypeValidator<A extends SavedObjectAttributes = SavedObjectAttributes> {
  private readonly type: string;
  private readonly validationMap: SavedObjectsValidationMap<A>;

  constructor({
    type,
    validationMap,
  }: {
    type: string;
    validationMap: SavedObjectsValidationMap<A> | (() => SavedObjectsValidationMap<A>);
  }) {
    this.type = type;
    this.validationMap = typeof validationMap === 'function' ? validationMap() : validationMap;
  }

  public validate(kibanaVersion: string, data: A): void {
    const validationRule = this.validationMap[kibanaVersion];
    if (!validationRule) {
      return; // no matching validation rule could be found; proceed without validating
    }

    if (isConfigSchema(validationRule)) {
      validationRule.validate(data, {});
    } else if (isValidationFunction(validationRule)) {
      this.validateFunction(data, validationRule);
    } else {
      throw new ValidationError(
        new SavedObjectsValidationError(
          `The ${kibanaVersion} validation for saved object of type [${this.type}] is malformed.`
        )
      );
    }
  }

  private validateFunction(data: A, validateFn: SavedObjectsValidationFunction) {
    try {
      validateFn({ ...data }); // shallow clone to prevent mutation
    } catch (err) {
      throw new ValidationError(new SavedObjectsValidationError(err));
    }
  }
}

function isValidationFunction(fn: any): fn is SavedObjectsValidationFunction {
  return typeof fn === 'function';
}
