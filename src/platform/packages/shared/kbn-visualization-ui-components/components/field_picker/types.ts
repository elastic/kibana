/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';

type FieldOnlyDataType =
  | 'document'
  | 'ip'
  | 'histogram'
  | 'geo_point'
  | 'geo_shape'
  | 'counter'
  | 'gauge'
  | 'murmur3';
export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;

export interface FieldOptionValue {
  type: 'field';
  field: string;
  dataType?: DataType;
}

interface FieldValue<T> {
  label: string;
  value: T;
  exists: boolean;
  compatible: number | boolean;
  'data-test-subj'?: string;
  // defined in groups
  options?: Array<FieldValue<T>>;
}

export type FieldOption<T extends FieldOptionValue> = FieldValue<T> & EuiComboBoxOptionOption<T>;
