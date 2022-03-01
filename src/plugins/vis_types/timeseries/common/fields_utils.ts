/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

import { isNestedField, FieldSpec, DataView } from '../../../data/common';
import { FieldNotFoundError } from './errors';
import type { FetchedIndexPattern, SanitizedFieldType } from './types';
import { FieldFormat, FieldFormatsRegistry, FIELD_FORMAT_IDS } from '../../../field_formats/common';

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
  return fields ? ([fields].flat().filter(Boolean) as string[]) : [];
};

export const getMultiFieldLabel = (fieldForTerms: string[], fields?: SanitizedFieldType[]) => {
  const firstFieldLabel = fields ? extractFieldLabel(fields, fieldForTerms[0]) : fieldForTerms[0];

  if (fieldForTerms.length > 1) {
    return i18n.translate('visTypeTimeseries.fieldUtils.multiFieldLabel', {
      defaultMessage: '{firstFieldLabel} + {count} {count, plural, one {other} other {others}}',
      values: {
        firstFieldLabel,
        count: fieldForTerms.length - 1,
      },
    });
  }
  return firstFieldLabel ?? '';
};

export const createCachedFieldValueFormatter = (
  dataView?: DataView | null,
  fields?: SanitizedFieldType[],
  fieldFormatService?: FieldFormatsRegistry,
  excludedFieldFormatsIds: FIELD_FORMAT_IDS[] = []
) => {
  const cache = new Map<string, FieldFormat>();

  return (fieldName: string, value: string, contentType: 'text' | 'html' = 'text') => {
    const cachedFormatter = cache.get(fieldName);
    if (cachedFormatter) {
      return cachedFormatter.convert(value, contentType);
    }

    if (dataView && !excludedFieldFormatsIds.includes(dataView.fieldFormatMap?.[fieldName]?.id)) {
      const field = dataView.fields.getByName(fieldName);
      if (field) {
        const formatter = dataView.getFormatterForField(field);

        if (formatter) {
          cache.set(fieldName, formatter);
          return formatter.convert(value, contentType);
        }
      }
    } else if (fieldFormatService && fields) {
      const f = fields.find((item) => item.name === fieldName);

      if (f) {
        const formatter = fieldFormatService.getDefaultInstance(f.type);

        if (formatter) {
          cache.set(fieldName, formatter);
          return formatter.convert(value, contentType);
        }
      }
    }
  };
};

export const MULTI_FIELD_VALUES_SEPARATOR = ' › ';
