/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiFieldPasswordProps } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import { PasswordField as FormPasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { BaseWidgetProps } from '../types';

type PasswordWidgetProps = BaseWidgetProps<z.ZodString, EuiFieldPasswordProps>;

export const PasswordField: React.FC<PasswordWidgetProps> = ({
  path,
  schema,
  fieldProps,
  fieldConfig,
  formConfig,
}) => {
  return (
    <UseField
      path={path}
      component={FormPasswordField}
      config={{ ...fieldConfig }}
      componentProps={{
        ...fieldProps,
        euiFieldProps: {
          type: 'dual',
          ...fieldProps?.euiFieldProps,
        },
      }}
    />
  );
};
