/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, type ReactNode, memo, useMemo } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type {
  FieldFormatsStartCommon,
  IFieldFormat,
  HtmlContextTypeOptions,
  ReactContextTypeOptions,
} from '@kbn/field-formats-plugin/common';
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
 * Internal component that renders formatter HTML output via dangerouslySetInnerHTML.
 * This is used as a fallback when the formatter doesn't support React rendering.
 */
const LegacyHtmlAdapter: FC<{
  html: string;
  className?: string;
  'data-test-subj'?: string;
}> = memo(({ html, className, 'data-test-subj': dataTestSubj }) => {
  return (
    <span
      className={className}
      data-test-subj={dataTestSubj}
      // The HTML from field formatters is sanitized and safe for rendering.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

LegacyHtmlAdapter.displayName = 'LegacyHtmlAdapter';

/**
 * Internal component that renders a formatted value using the appropriate rendering path.
 * Tries React rendering first, falls back to HTML rendering if not supported.
 */
const FormattedValueInternal: FC<{
  fieldFormat: IFieldFormat;
  value: unknown;
  options: HtmlContextTypeOptions & ReactContextTypeOptions;
  className?: string;
  'data-test-subj'?: string;
}> = memo(({ fieldFormat, value, options, className, 'data-test-subj': dataTestSubj }) => {
  const formattedContent = useMemo<ReactNode>(() => {
    // Try React rendering first (preferred path)
    const reactResult = fieldFormat.convertToReact(value, {
      ...options,
      className,
      'data-test-subj': dataTestSubj,
    });
    if (reactResult !== undefined) {
      return reactResult;
    }

    // Fall back to HTML rendering via legacy adapter
    const htmlResult = fieldFormat.convert(value, 'html', options);
    return (
      <LegacyHtmlAdapter html={htmlResult} className={className} data-test-subj={dataTestSubj} />
    );
  }, [fieldFormat, value, options, className, dataTestSubj]);

  return <>{formattedContent}</>;
});

FormattedValueInternal.displayName = 'FormattedValueInternal';

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
    const options: HtmlContextTypeOptions & ReactContextTypeOptions = {
      hit,
      field,
    };

    return (
      <FormattedValueInternal
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
