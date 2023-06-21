/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import {
  UseField,
  ValidationConfig,
  FieldConfig,
  getFieldValidityAndErrorMessage,
} from '../../shared_imports';
import { IndexPatternConfig } from '../../types';
import { schema } from '../form_schema';

interface NameFieldProps {
  namesNotAllowed: string[];
}

interface GetNameConfigArgs {
  namesNotAllowed: string[];
}

const createNameNoDupesValidator = (
  namesNotAllowed: string[]
): ValidationConfig<{}, string, string> => ({
  validator: ({ value }) => {
    if (namesNotAllowed.includes(value)) {
      return {
        message: i18n.translate('indexPatternEditor.dataViewExists.ValidationErrorMessage', {
          defaultMessage: 'A data view with this name already exists.',
        }),
      };
    }
  },
});

const getNameConfig = ({ namesNotAllowed }: GetNameConfigArgs): FieldConfig<string> => {
  const nameFieldConfig = schema.name;

  const validations = [...nameFieldConfig.validations, createNameNoDupesValidator(namesNotAllowed)];

  return {
    ...nameFieldConfig!,
    validations,
  };
};

export const NameField = ({ namesNotAllowed }: NameFieldProps) => {
  const config = useMemo(
    () =>
      getNameConfig({
        namesNotAllowed,
      }),
    [namesNotAllowed]
  );

  return (
    <UseField<string, IndexPatternConfig>
      path="name"
      config={config}
      componentProps={{
        euiFieldProps: {
          'aria-label': i18n.translate('indexPatternEditor.form.nameAriaLabel', {
            defaultMessage: 'Name field optional',
          }),
        },
      }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow label={field.label} fullWidth error={errorMessage} isInvalid={isInvalid}>
            <EuiFieldText
              value={field.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                field.setValue(e.target.value);
              }}
              fullWidth
              data-test-subj="createIndexPatternNameInput"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
