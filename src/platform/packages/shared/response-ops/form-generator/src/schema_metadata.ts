/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface WidgetOptions {
  label?: string;
  placeholder?: string;
  default?: unknown;
  helpText?: string;
  isDisabled?: boolean;
  addButtonLabel?: string;
  [key: string]: unknown;
}

// temporary, I would think this should be in the spec. We definitely need type
// for our meta object
export interface FieldMeta {
  widget: 'text' | 'password' | 'select' | 'formFieldset' | 'keyValue';
  widgetOptions?: WidgetOptions;
  [key: string]: unknown;
}
