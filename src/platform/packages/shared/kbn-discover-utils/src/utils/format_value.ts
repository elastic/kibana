/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type {
  FieldFormatsContentType,
  HtmlContextTypeOptions,
  ReactContextTypeOptions,
  TextContextTypeOptions,
} from '@kbn/field-formats-plugin/common/types';
import type { EsHitRecord } from '../types';

/** Base parameters for field value formatting functions */
interface FormatFieldValueBaseParams {
  value: unknown;
  fieldFormats: FieldFormatsStart;
  dataView?: DataView;
  field?: DataViewField;
}

export interface FormatFieldValueReactParams extends FormatFieldValueBaseParams {
  hit: EsHitRecord;
  options?: ReactContextTypeOptions;
}

export interface FormatFieldValueTextParams extends FormatFieldValueBaseParams {
  options?: TextContextTypeOptions;
}

/**
 * Returns the appropriate field formatter for the given field and data view,
 * or the default string formatter if no field/data view is available.
 */
const getFieldFormatter = (
  fieldFormats: FieldFormatsStart,
  dataView?: DataView,
  field?: DataViewField
): FieldFormat => {
  return !dataView || !field
    ? fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING)
    : dataView.getFormatterForField(field);
};

/**
 * Formats the value of a specific field using the appropriate field formatter if available
 * or the default string field formatter otherwise.
 *
 * @deprecated Use `formatFieldValueReact` instead for React components to avoid dangerouslySetInnerHTML.
 * This function returns HTML strings and should only be used when `contentType: 'text'` is needed,
 * or in legacy code paths that haven't been migrated yet (e.g., UnifiedDocViewer, SummaryColumn).
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

  return getFieldFormatter(fieldFormats, dataView, field).convert(
    value,
    usedContentType,
    converterOptions
  );
}

/**
 * React equivalent of formatFieldValue. Returns a ReactNode rendered via reactConvert,
 * which is safe to render directly without dangerouslySetInnerHTML.
 *
 * @returns A ReactNode that can be rendered directly
 */
export const formatFieldValueReact = ({
  value,
  hit,
  fieldFormats,
  dataView,
  field,
  options,
}: FormatFieldValueReactParams): ReactNode => {
  const converterOptions: ReactContextTypeOptions = { ...options, hit, field };

  return getFieldFormatter(fieldFormats, dataView, field).reactConvert(value, converterOptions);
};

/**
 * Text equivalent of formatFieldValueReact. Returns a plain text string without HTML tags.
 * Use this when you need string values for further processing (e.g., in LogDocumentOverview).
 *
 * Note: Unlike formatFieldValueReact, this does not accept `hit` because text formatters
 * do not apply highlighting (highlighting requires HTML/React markup).
 *
 * @returns A plain text string
 */
export const formatFieldValueText = ({
  value,
  fieldFormats,
  dataView,
  field,
  options,
}: FormatFieldValueTextParams): string => {
  return getFieldFormatter(fieldFormats, dataView, field).convert(value, 'text', options);
};
