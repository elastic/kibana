/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

import { isNestedField, FieldSpec } from '../../../data/common';
import { FieldNotFoundError } from './errors';
import type { FetchedIndexPattern, SanitizedFieldType } from './types';

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

export const getFieldsForTerms = (fields: string | Array<string | null> | undefined): string[] => {
  return fields ? (Array.isArray(fields) ? (fields.filter(Boolean) as string[]) : [fields]) : [];
};

export const getMultiFieldLabel = (fieldForTerms: string[], fields?: SanitizedFieldType[]) => {
  const firstFieldLabel = fields ? extractFieldLabel(fields, fieldForTerms[0]) : fieldForTerms[0];

  if (fieldForTerms.length > 1) {
    return i18n.translate('visTypeTimeseries.fieldUtils.multiFieldLabel', {
      defaultMessage: '{firstFieldLabel} + {length} other',
      values: {
        firstFieldLabel,
        length: fieldForTerms.length - 1,
      },
    });
  }
  return firstFieldLabel ?? '';
};

export const MULTI_FIELD_VALUES_SEPARATOR = ' › ';
