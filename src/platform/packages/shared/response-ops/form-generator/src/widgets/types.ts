/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { FieldDefinition } from '../form';
import type { BaseMetadata } from '../schema_metadata';

export enum WidgetType {
  Text = 'text',
  Password = 'password',
  Select = 'select',
  FormFieldset = 'formFieldset',
}

export interface BaseWidgetProps<T = unknown, TMeta extends BaseMetadata = BaseMetadata> {
  fieldId: string;
  value: T;
  label?: string;
  placeholder?: string;
  helpText?: string;
  fullWidth?: boolean;
  error?: string | string[];
  isInvalid?: boolean;
  onChange: (fieldId: string, value: T) => void;
  onBlur: (fieldId: string, value: T) => void;
  schema?: z.ZodTypeAny;
  meta?: TMeta;
  setFieldError?: (fieldId: string, error: string | string[] | undefined) => void;
  setFieldTouched?: (fieldId: string, touched?: boolean) => void;
  getFieldValue?: (fieldId: string) => unknown;
  validateField?: (
    fieldId: string,
    value: unknown,
    fieldDefinitions: FieldDefinition[]
  ) => string | string[] | undefined;
  errors?: Record<string, string | string[]>;
  touched?: Record<string, boolean>;
}
