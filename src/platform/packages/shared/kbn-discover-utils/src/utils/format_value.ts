/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { TextContextTypeOptions } from '@kbn/field-formats-plugin/common/types';

/** Base parameters for field value formatting functions */
export interface FormatFieldValueBaseParams {
  value: unknown;
  fieldFormats: FieldFormatsStart;
  dataView?: DataView;
  field?: DataViewField;
}

export interface FormatFieldValueTextParams extends FormatFieldValueBaseParams {
  options?: TextContextTypeOptions;
}

/**
 * Returns the appropriate field formatter for the given field and data view,
 * or the default string formatter if no field/data view is available.
 */
export const getFieldFormatter = (
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
export const canTruncateValue = (formatter: FieldFormat): boolean => {
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
