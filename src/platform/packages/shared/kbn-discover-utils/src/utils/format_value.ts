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
 * React equivalent of formatFieldValueText. Returns a ReactNode rendered via reactConvert,
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

export interface FormatFieldStringWithHighlightsParams {
  value: unknown;
  hit: EsHitRecord;
  fieldFormats: FieldFormatsStart;
  /** Optional data view to look up the field. If provided with fieldName, will attempt to get the DataViewField */
  dataView?: DataView;
  /** The field name for highlight lookup. If dataView is provided, will attempt to get DataViewField from it */
  fieldName?: string;
  options?: ReactContextTypeOptions;
}

/**
 * Formats a value using the default string formatter with React output and search highlighting.
 *
 * This is a convenience function for formatting values when you only have a field name (not a DataViewField).
 * It attempts to look up the field in the data view, falling back to a minimal field object with just the name.
 * This fallback ensures search highlighting still works even for fields not in the data view (e.g., OTel body.text).
 *
 * @param value - The value to format
 * @param hit - The ES hit record containing highlight information
 * @param fieldFormats - Field formats service
 * @param dataView - Optional data view to look up the field
 * @param fieldName - The field name for highlight lookup
 * @param options - Additional options for the formatter
 * @returns A ReactNode that can be rendered directly
 */
export const formatFieldStringValueWithHighlights = ({
  value,
  hit,
  fieldFormats,
  dataView,
  fieldName,
  options,
}: FormatFieldStringWithHighlightsParams): ReactNode => {
  // Pass field name for highlight lookup in hit.highlight.
  // The field may not exist in the data view (e.g., OTel body.text) but highlights should still apply.
  const field = fieldName
    ? dataView?.fields.getByName(fieldName) ?? { name: fieldName }
    : undefined;

  return fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING).reactConvert(value, {
    ...options,
    hit,
    field,
  });
};
