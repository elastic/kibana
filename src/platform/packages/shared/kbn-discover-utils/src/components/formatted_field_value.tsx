/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { ReactContextTypeOptions } from '@kbn/field-formats-plugin/common/types';
import type { EsHitRecord } from '../types';
import { formatFieldValueReact } from '../utils/format_value';

interface FormattedFieldValueProps {
  value: unknown;
  hit: EsHitRecord;
  fieldFormats: FieldFormatsStart;
  dataView?: DataView;
  field?: DataViewField;
  options?: ReactContextTypeOptions;
  className?: string;
}

/**
 * Declarative React component that formats a field value using the 'react' content type.
 * Renders the formatted value directly as a React child — no dangerouslySetInnerHTML.
 */
export const FormattedFieldValue: React.FC<FormattedFieldValueProps> = ({
  value,
  hit,
  fieldFormats,
  dataView,
  field,
  options,
  className,
}) => {
  const content = formatFieldValueReact(value, hit, fieldFormats, dataView, field, options);

  if (className) {
    return <span className={className}>{content}</span>;
  }

  return <>{content}</>;
};
