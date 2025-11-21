/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { z } from '@kbn/zod/v4';
import { SelectField as FormSelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { EuiSelectProps } from '@elastic/eui';
import type { BaseWidgetProps } from '../types';

type SelectWidgetProps = BaseWidgetProps<z.ZodEnum<any>, EuiSelectProps>;

export const getOptions = (schema: z.ZodEnum): EuiSelectProps['options'] => {
  return schema.options.map((option) => {
    return {
      value: option,
      text: option,
    };
  });
};

export const SelectWidget: React.FC<SelectWidgetProps> = ({
  path,
  schema,
  fieldProps,
  fieldConfig,
  formConfig,
}) => {
  if (!(schema instanceof z.ZodEnum)) {
    throw new Error('SelectWidget requires a ZodEnum schema');
  }

  const options = getOptions(schema) ?? [];

  return (
    <UseField
      path={path}
      component={FormSelectField}
      config={{ ...fieldConfig, defaultValue: fieldConfig?.defaultValue || options[0].value }}
      componentProps={{
        ...fieldProps,
        euiFieldProps: {
          ...fieldProps.euiFieldProps,
          options,
        },
      }}
    />
  );
};
