/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';

export const formatValueAsText = (value: number | string, fieldFormatter: IFieldFormat) => {
  if (typeof value === 'number' && isNaN(value)) {
    return '-';
  }

  return fieldFormatter.convert(value, 'text');
};

export const formatValueAsReactNode = (
  value: number | string,
  fieldFormatter: IFieldFormat
): ReactNode => {
  if (typeof value === 'number' && isNaN(value)) {
    return '-';
  }

  return fieldFormatter.reactConvert(value);
};
