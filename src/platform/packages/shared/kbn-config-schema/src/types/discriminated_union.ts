/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { get } from 'lodash';
import { SchemaTypeError, SchemaTypesError } from '../errors';
import { internals } from '../internals';
import { Type, type TypeOptions, type TypeMeta } from './type';
import { META_FIELD_X_OAS_DISCRIMINATOR } from '../oas_meta_fields';

export type DiscriminatedUnionTypeOptions<T> = TypeOptions<T> & {
  meta?: Omit<TypeMeta, 'id'>;
};

export class DiscriminatedUnionType<RTS extends Array<Type<any>>, T> extends Type<T> {
  private readonly discriminator: string;

  constructor(discriminator: string, types: RTS, options?: DiscriminatedUnionTypeOptions<T>) {
    let schema = internals.alternatives(types.map((type) => type.getSchema())).match('one');
    schema = schema.meta({ [META_FIELD_X_OAS_DISCRIMINATOR]: discriminator });

    super(schema, options);
    this.discriminator = discriminator;
  }

  protected handleError(type: string, { value, details }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'any.required':
        return `expected at least one defined value but got [${typeDetect(value)}]`;
      case 'alternatives.any':
        if (!this.discriminator) return;
        const nonDiscriminatorDetails: AlternativeAnyErrorDetail[] = [];
        const isDiscriminatorError = details.every((detail: AlternativeAnyErrorDetail) => {
          if (detail.details.length !== 1) {
            nonDiscriminatorDetails.push(detail);
            return false;
          }
          const errorPath = get(detail, 'details.0.context.error.path');
          if (errorPath[errorPath.length - 1] !== this.discriminator) {
            nonDiscriminatorDetails.push(detail);
            return false;
          }
          return true;
        });
        if (isDiscriminatorError) {
          return new SchemaTypeError(
            `value [${value?.[this.discriminator]}] did not match any of the allowed values for [${
              this.discriminator
            }]: [${details.map((detail: AlternativeAnyErrorDetail) => detail.message).join(', ')}]`,
            path
          );
        } else if (
          nonDiscriminatorDetails.length === 1 &&
          get(nonDiscriminatorDetails, '0.details.length') === 1
        ) {
          const childPath = get(nonDiscriminatorDetails, '0.details.0.context.error.path');
          return new SchemaTypeError(nonDiscriminatorDetails[0].message, childPath);
        }
        return errorDetailToSchemaTypeError(
          'types that failed validation:',
          nonDiscriminatorDetails.flatMap((detail) => detail.details),
          path
        );
      case 'alternatives.one':
        return new SchemaTypeError(
          `value [${value?.[this.discriminator]}] matched more than one allowed type of [${
            this.discriminator
          }]`,
          path
        );
      case 'alternatives.match':
        return errorDetailToSchemaTypeError(
          'types that failed validation:',
          details as AlternativeMatchErrorDetail[],
          path
        );
    }
  }
}

interface ErrorDetail {
  context: {
    error: SchemaTypeError;
  };
}

interface AlternativeAnyErrorDetail {
  message: string;
  details: ErrorDetail[];
}

type AlternativeMatchErrorDetail = ErrorDetail;

function errorDetailToSchemaTypeError(
  message: string,
  details: ErrorDetail[],
  path: string[]
): SchemaTypeError {
  return new SchemaTypesError(
    message,
    path,
    details.map((detail: AlternativeMatchErrorDetail, index: number) => {
      const e = detail.context.error;
      const childPathWithIndex = e.path.slice();
      childPathWithIndex.splice(path.length, 0, index.toString());

      return e instanceof SchemaTypesError
        ? new SchemaTypesError(e.message, childPathWithIndex, e.errors)
        : new SchemaTypeError(e.message, childPathWithIndex);
    })
  );
}
