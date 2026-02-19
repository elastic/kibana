/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, type FC, type ReactNode } from 'react';
import { isNumber } from 'lodash';
import { FIELD_FORMAT_IDS, FormattedValue } from '@kbn/field-formats-plugin/common';
import type { FieldFormatMap, DataView } from '@kbn/data-views-plugin/common';
import { isEmptyValue, DISPLAY_EMPTY_VALUE } from '../../../../common/last_value_utils';
import { getFieldFormats } from '../../../services';

interface FormattedFieldValueProps {
  value: unknown;
  fieldName?: string;
  fieldFormatMap?: FieldFormatMap;
  hasColorRules?: boolean;
  dataView?: DataView;
}

/**
 * React component that renders a formatted field value using the field format registry.
 * This is the React equivalent of createFieldFormatter for cases where rich formatting
 * (colors, links) is needed.
 *
 * @example
 * ```tsx
 * <FormattedFieldValue
 *   value={item.last}
 *   fieldName={getMetricsField(column.metrics)}
 *   fieldFormatMap={fieldFormatMap}
 *   hasColorRules={hasColorRules}
 * />
 * ```
 */
export const FormattedFieldValue: FC<FormattedFieldValueProps> = memo(
  ({ value, fieldName = '', fieldFormatMap, hasColorRules = false, dataView }) => {
    const fieldFormats = getFieldFormats();

    if (isEmptyValue(value)) {
      return <>{DISPLAY_EMPTY_VALUE}</>;
    }

    const serializedFieldFormat = fieldFormatMap?.[fieldName];
    const shouldSkipFormatting =
      !serializedFieldFormat ||
      (hasColorRules && serializedFieldFormat?.id === FIELD_FORMAT_IDS.COLOR);

    const fieldType = dataView?.getFieldByName(fieldName)?.type || 'number';
    const defaultFieldFormat =
      fieldType === 'date'
        ? { id: 'date' }
        : fieldType === 'string'
        ? { id: 'string' }
        : fieldType === 'boolean'
        ? { id: 'boolean' }
        : { id: 'number' };

    const fieldFormat = fieldFormats.deserialize(
      shouldSkipFormatting ? defaultFieldFormat : serializedFieldFormat
    );

    if (fieldType === 'number' && !isNumber(value) && shouldSkipFormatting) {
      return <>{String(value)}</>;
    }

    return <FormattedValue fieldFormat={fieldFormat} value={value} options={{}} />;
  }
);

FormattedFieldValue.displayName = 'FormattedFieldValue';

/**
 * Creates a React-based field formatter function that returns React nodes.
 * This replaces createFieldFormatter for cases where rich formatting is needed.
 *
 * @param fieldName - The name of the field to format
 * @param fieldFormatMap - Map of field names to field format configurations
 * @param hasColorRules - Whether color rules are already applied (skips color formatting)
 * @param dataView - The data view for field type detection
 * @returns A function that formats values as React nodes
 */
export const createFieldFormatterReact = (
  fieldName: string = '',
  fieldFormatMap?: FieldFormatMap,
  hasColorRules: boolean = false,
  dataView?: DataView
): ((value: unknown) => ReactNode) => {
  return (value: unknown) => (
    <FormattedFieldValue
      value={value}
      fieldName={fieldName}
      fieldFormatMap={fieldFormatMap}
      hasColorRules={hasColorRules}
      dataView={dataView}
    />
  );
};
