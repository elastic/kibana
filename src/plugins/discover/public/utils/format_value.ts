/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import type {
  FieldFormatsContentType,
  HtmlContextTypeOptions,
  TextContextTypeOptions,
} from '@kbn/field-formats-plugin/common/types';
import { DataTableRecord } from '../types';

/**
 * Formats the value of a specific field using the appropriate field formatter if available
 * or the default string field formatter otherwise.
 *
 * @param columnId The value to format
 * @param record The actual search hit (required to get highlight information from)
 * @param dataView The data view if available
 * @param contentType Type of a converter
 * @param options Options for the converter
 * @returns An sanitized HTML string, that is safe to be applied via dangerouslySetInnerHTML
 */
export function formatFieldValue(
  columnId: string,
  record: DataTableRecord,
  dataView: DataView,
  contentType?: FieldFormatsContentType,
  options?: HtmlContextTypeOptions | TextContextTypeOptions
): string {
  const usedContentType = contentType ?? 'html';
  const field = dataView.fields.getByName(columnId);
  const value = record.flattened[columnId];
  const converterOptions: HtmlContextTypeOptions | TextContextTypeOptions = {
    hit: record.raw,
    field,
    ...options,
  };
  const formatter = dataView.getFormatterForField(field);
  if (contentType === 'text') {
    (Array.isArray(value) ? value : [value])
      .map((val) => {
        const formatted = formatter.convert(val, usedContentType, converterOptions);
        return stringify(formatted, true);
      })
      .join(',');
  }

  return formatter.convert(value, usedContentType, converterOptions);
}

const stringify = (val: object | string, disableMultiline: boolean) => {
  // it can wrap "strings" with quotes
  return disableMultiline ? JSON.stringify(val) : JSON.stringify(val, null, 2);
};
