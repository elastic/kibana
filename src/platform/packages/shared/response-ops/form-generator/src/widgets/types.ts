/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { FormConfig } from '../form';

export enum WidgetType {
  Text = 'text',
  Password = 'password',
  Select = 'select',
  FormFieldset = 'formFieldset',
}

export interface BaseWidgetProps<
  TSchema extends z.ZodType = z.ZodType,
  TEuiFieldProps = Record<string, unknown>,
  TOption = unknown
> {
  path: string;
  schema: TSchema;
  formConfig: FormConfig;
  fieldConfig: {
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ) => ReturnType<ValidationFunc<any, ERROR_CODE>>;
      }
    ];
    defaultValue?: z.infer<TSchema>;
  } & Record<string, unknown>;
  fieldProps: { euiFieldProps: TEuiFieldProps } & Record<string, unknown>;
  options?: TOption[];
}

export type BaseWidgetPropsWithOptions<
  TSchema extends z.ZodType = z.ZodType,
  TEuiFieldProps = Record<string, unknown>,
  TOption = Record<string, unknown>
> = BaseWidgetProps<TSchema, TEuiFieldProps, TOption> & {
  options: TOption[];
};
