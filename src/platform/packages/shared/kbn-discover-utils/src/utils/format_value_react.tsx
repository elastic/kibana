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
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ReactContextTypeOptions } from '@kbn/field-formats-plugin/common/types';
import type { EsHitRecord } from '../types';
import { truncateFieldValueWithHighlights } from './truncate_field_value';
import {
  canTruncateValue,
  getFieldFormatter,
  type FormatFieldValueBaseParams,
} from './format_value';

export interface FormatFieldValueReactParams extends FormatFieldValueBaseParams {
  hit: EsHitRecord;
  options?: ReactContextTypeOptions;
  /**
   * When set, the raw value is cut to this many characters before formatting and rendered
   * with a trailing '…'. Leave unset to render the full value.
   */
  maxDisplayLength?: number;
}

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
