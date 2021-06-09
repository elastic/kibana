/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FieldSpec } from '../../data/common';
import { isNestedField } from '../../data/common';
import { FetchedIndexPattern, SanitizedFieldType } from './types';

export class FieldNotFoundError extends Error {
  constructor(name: string) {
    super(
      i18n.translate('visTypeTimeseries.fields.fieldNotFound', {
        defaultMessage: `Field "{field}" not found`,
        values: { field: name },
      })
    );
  }

  public get name() {
    return this.constructor.name;
  }

  public get body() {
    return this.message;
  }
}

export const extractFieldLabel = (
  fields: SanitizedFieldType[],
  name: string,
  isThrowErrorOnFieldNotFound: boolean = true
) => {
  if (fields.length && name) {
    const field = fields.find((f) => f.name === name);

    if (field) {
      return field.label || field.name;
    }
    if (isThrowErrorOnFieldNotFound) {
      throw new FieldNotFoundError(name);
    }
  }
  return name;
};

export function validateField(name: string, index: FetchedIndexPattern) {
  if (name && index.indexPattern) {
    const field = index.indexPattern.fields.find((f) => f.name === name);
    if (!field) {
      throw new FieldNotFoundError(name);
    }
  }
}

export const toSanitizedFieldType = (fields: FieldSpec[]) =>
  fields
    .filter((field) => field.aggregatable && !isNestedField(field))
    .map(
      (field) =>
        ({
          name: field.name,
          label: field.customLabel ?? field.name,
          type: field.type,
        } as SanitizedFieldType)
    );
