/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type {
  ReactContextTypeOptions,
  TextContextTypeOptions,
} from '@kbn/field-formats-plugin/common/types';
import type { EsHitRecord } from '../types';
import { truncateFieldValueWithHighlights } from './truncate_field_value';

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
  /**
   * When set, the raw value is cut to this many characters before formatting and rendered
   * with a trailing '…'. Leave unset to render the full value.
   */
  maxDisplayLength?: number;
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

const CASE_TRANSFORMS = ['lower', 'upper', 'title'];

// Cutting a value before formatting is only safe for formatters that leave its text as it is. The URL, Color and
// Static Lookup formatters, the Short Dots, Base64 and URL Param Decode transforms of the String formatter, and
// formatters registered by other plugins need the whole value to render correctly, so they are given the full value.
const canTruncateValue = (formatter: FieldFormat): boolean => {
  // tests often mock formatters as plain objects without a type
  const formatterId = formatter.type?.id;

  if (formatterId === FIELD_FORMAT_IDS.TRUNCATE) {
    return true;
  }

  if (formatterId === FIELD_FORMAT_IDS.STRING) {
    const transform = formatter.param('transform');
    return !transform || CASE_TRANSFORMS.includes(transform);
  }

  return false;
};

/**
 * Returns whether a value of the given field can be truncated before formatting without changing its formatted output.
 */
export const canTruncateFieldValue = ({
  fieldFormats,
  dataView,
  field,
}: Omit<FormatFieldValueBaseParams, 'value'>): boolean =>
  canTruncateValue(getFieldFormatter(fieldFormats, dataView, field));

const convertToReactWithMaxLength = (
  formatter: FieldFormat,
  value: unknown,
  { hit, ...options }: ReactContextTypeOptions & { hit: EsHitRecord },
  maxDisplayLength: number | undefined
): ReactNode => {
  const maxLength =
    maxDisplayLength !== undefined && canTruncateValue(formatter) ? maxDisplayLength : undefined;
  const truncated = truncateFieldValueWithHighlights({
    value,
    maxLength,
    fieldName: options.field?.name,
    hit,
  });
  const formatted = formatter.convertToReact(truncated.value, { ...options, hit: truncated.hit });

  return truncated.isTruncated ? <>{formatted}…</> : formatted;
};

/**
 * React equivalent of formatFieldValueText. Returns a ReactNode rendered via convertToReact,
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
  maxDisplayLength,
}: FormatFieldValueReactParams): ReactNode => {
  return convertToReactWithMaxLength(
    getFieldFormatter(fieldFormats, dataView, field),
    value,
    { ...options, hit, field },
    maxDisplayLength
  );
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
  return getFieldFormatter(fieldFormats, dataView, field).convertToText(value, options);
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
  /**
   * When set, the raw value is cut to this many characters before formatting and rendered
   * with a trailing '…'. Leave unset to render the full value.
   */
  maxDisplayLength?: number;
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
  maxDisplayLength,
}: FormatFieldStringWithHighlightsParams): ReactNode => {
  // Pass field name for highlight lookup in hit.highlight.
  // The field may not exist in the data view (e.g., OTel body.text) but highlights should still apply.
  const field = fieldName
    ? dataView?.fields.getByName(fieldName) ?? { name: fieldName }
    : undefined;

  return convertToReactWithMaxLength(
    fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING),
    value,
    { ...options, hit, field },
    maxDisplayLength
  );
};
