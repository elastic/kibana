/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { EuiFormRow, EuiSpacer, EuiCheckableCard, useGeneratedHtmlId } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  options: Array<{
    label: string;
    value: string;
    children: React.ReactNode;
    'data-test-subj'?: string;
  }>;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const CardRadioGroupField = ({
  field,
  options,
  euiFieldProps = {},
  idAria,
  ...rest
}: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const radioGroupId = useGeneratedHtmlId({ prefix: 'radioGroup' });

  return (
    <EuiFormRow
      label={field.label}
      labelType="legend"
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <>
        {options.map(({ label, value, children, 'data-test-subj': dataTestSubj }) => (
          <Fragment key={`${radioGroupId}-${value}`}>
            <EuiCheckableCard
              id={`${radioGroupId}-${value}`}
              label={label}
              value={value}
              name={radioGroupId}
              checked={field.value === value}
              onChange={() => field.setValue(value)}
              data-test-subj={dataTestSubj}
            >
              {children}
            </EuiCheckableCard>
            <EuiSpacer size="s" />
          </Fragment>
        ))}
      </>
    </EuiFormRow>
  );
};
