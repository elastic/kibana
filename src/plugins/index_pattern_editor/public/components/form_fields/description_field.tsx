/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '../../../../es_ui_shared/static/forms/hook_form_lib';
import { IndexPatternConfig } from '../../types';

export interface Props {
  description: string;
}

export const DescriptionField = ({ description }: Props) => {
  return (
    <UseField<string, IndexPatternConfig>
      path="description"
      componentProps={{
        euiFieldProps: {
          'aria-label': i18n.translate('indexPatternEditor.form.descriptionAriaLabel', {
            defaultMessage: 'Description field',
          }),
        },
      }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow
            label={field.label}
            labelAppend={field.labelAppend}
            helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
            error={errorMessage}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isInvalid}
              value={field.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                e.persist();
                field.setValue(e.target.value);
              }}
              isLoading={field.isValidating}
              fullWidth
              data-test-subj="createIndexPatternDescriptionInput"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
