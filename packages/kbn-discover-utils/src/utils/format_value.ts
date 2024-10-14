/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type {
  FieldFormatsContentType,
  HtmlContextTypeOptions,
  TextContextTypeOptions,
} from '@kbn/field-formats-plugin/common/types';
import { EsHitRecord } from '../types';

/**
 * Formats the value of a specific field using the appropriate field formatter if available
 * or the default string field formatter otherwise.
 *
 * @param value The value to format
 * @param hit The actual search hit (required to get highlight information from)
 * @param fieldFormats Field formatters
 * @param dataView The data view if available
 * @param field The field that value was from if available
 * @param contentType Type of a converter
 * @param options Options for the converter
 * @returns An sanitized HTML string, that is safe to be applied via dangerouslySetInnerHTML
 */
export function formatFieldValue(
  value: unknown,
  hit: EsHitRecord,
  fieldFormats: FieldFormatsStart,
  dataView?: DataView,
  field?: DataViewField,
  contentType?: FieldFormatsContentType,
  options?: HtmlContextTypeOptions | TextContextTypeOptions
): string {
  const usedContentType = contentType ?? 'html';
  const converterOptions: HtmlContextTypeOptions | TextContextTypeOptions = {
    hit,
    field,
    ...options,
  };

  if (!dataView || !field) {
    // If either no field is available or no data view, we'll use the default
    // string formatter to format that field.
    return fieldFormats
      .getDefaultInstance(KBN_FIELD_TYPES.STRING)
      .convert(value, usedContentType, converterOptions);
  }

  // If we have a data view and field we use that fields field formatter
  return dataView.getFormatterForField(field).convert(value, usedContentType, converterOptions);
}
