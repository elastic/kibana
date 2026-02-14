/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, memo } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  FormattedValue,
  type FieldFormatsStartCommon,
  type FormattedValueProps,
} from '@kbn/field-formats-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { EsHitRecord } from '../types';

export interface FormatFieldValueReactProps {
  /**
   * The raw value to format
   */
  value: unknown;

  /**
   * The actual search hit (required to get highlight information from)
   */
  hit: EsHitRecord;

  /**
   * Field formatters service
   */
  fieldFormats: FieldFormatsStartCommon;

  /**
   * The data view if available
   */
  dataView?: DataView;

  /**
   * The field that the value was from, if available
   */
  field?: DataViewField;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional test subject for E2E testing
   */
  'data-test-subj'?: string;
}

/**
 * Renders a formatted field value using React components.
 *
 * This component is the React equivalent of the `formatFieldValue` function.
 * It automatically selects the best rendering approach:
 * - React rendering (preferred) when the formatter supports `reactConvert`
 * - Legacy HTML adapter (fallback) for formatters that only support `htmlConvert`
 *
 * ## Usage
 *
 * ```tsx
 * import { FormatFieldValueReact } from '@kbn/discover-utils';
 *
 * <FormatFieldValueReact
 *   value={row.flattened[columnId]}
 *   hit={row.raw}
 *   fieldFormats={fieldFormats}
 *   dataView={dataView}
 *   field={field}
 *   className="myCustomClass"
 * />
 * ```
 *
 * ## Migration from formatFieldValue
 *
 * Replace:
 * ```tsx
 * <span dangerouslySetInnerHTML={{
 *   __html: formatFieldValue(value, hit, fieldFormats, dataView, field)
 * }} />
 * ```
 *
 * With:
 * ```tsx
 * <FormatFieldValueReact
 *   value={value}
 *   hit={hit}
 *   fieldFormats={fieldFormats}
 *   dataView={dataView}
 *   field={field}
 * />
 * ```
 *
 * @public
 */
export const FormatFieldValueReact: FC<FormatFieldValueReactProps> = memo(
  ({ value, hit, fieldFormats, dataView, field, className, 'data-test-subj': dataTestSubj }) => {
    const fieldFormat = getFieldFormatter(fieldFormats, dataView, field);
    const options: FormattedValueProps['options'] = {
      hit,
      field,
    };

    return (
      <FormattedValue
        fieldFormat={fieldFormat}
        value={value}
        options={options}
        className={className}
        data-test-subj={dataTestSubj}
      />
    );
  }
);

FormatFieldValueReact.displayName = 'FormatFieldValueReact';

/**
 * Gets the appropriate field formatter for a field.
 *
 * @param fieldFormats - Field formatters service
 * @param dataView - The data view (optional)
 * @param field - The field (optional)
 * @returns The field formatter to use
 */
export function getFieldFormatter(
  fieldFormats: FieldFormatsStartCommon,
  dataView?: DataView,
  field?: DataViewField
) {
  if (!dataView || !field) {
    // If either no field is available or no data view, use the default string formatter
    return fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING);
  }

  // Use the data view's formatter for this field
  return dataView.getFormatterForField(field);
}
