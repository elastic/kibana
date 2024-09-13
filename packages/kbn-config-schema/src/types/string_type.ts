/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions, convertValidationFunction } from './type';

import { META_FIELD_X_OAS_MIN_LENGTH, META_FIELD_X_OAS_MAX_LENGTH } from '../oas_meta_fields';

export type StringOptions = TypeOptions<string> & {
  minLength?: number;
  maxLength?: number;
  hostname?: boolean;
  coerceFromNumber?: boolean;
};

export class StringType extends Type<string> {
  constructor(options: StringOptions = {}) {
    // We want to allow empty strings, however calling `allow('')` causes
    // Joi to allow the value and skip any additional validation.
    // Instead, we reimplement the string validator manually except in the
    // hostname case where empty strings aren't allowed anyways.
    let schema =
      options.hostname === true
        ? internals.string().hostname()
        : internals.any().custom((value, { error }) => {
            if (typeof value !== 'string') {
              if (options.coerceFromNumber && typeof value === 'number') {
                return value.toString(10);
              }
              return error('any.custom', {
                message: `expected value of type [string] but got [${typeDetect(value)}]`,
              });
            }
            return value;
          });

    if (options.minLength !== undefined) {
      schema = schema
        .custom(
          convertValidationFunction((value) => {
            if (value.length < options.minLength!) {
              return `value has length [${value.length}] but it must have a minimum length of [${options.minLength}].`;
            }
          })
        )
        .meta({ [META_FIELD_X_OAS_MIN_LENGTH]: options.minLength });
    }

    if (options.maxLength !== undefined) {
      schema = schema
        .custom(
          convertValidationFunction((value) => {
            if (value.length > options.maxLength!) {
              return `value has length [${value.length}] but it must have a maximum length of [${options.maxLength}].`;
            }
          })
        )
        .meta({ [META_FIELD_X_OAS_MAX_LENGTH]: options.maxLength });
    }

    schema.type = 'string';
    super(schema, options);
  }

  protected handleError(type: string, { limit, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
        return `expected value of type [string] but got [${typeDetect(value)}]`;
      case 'string.hostname':
        return `value must be a valid hostname (see RFC 1123).`;
    }
  }
}
