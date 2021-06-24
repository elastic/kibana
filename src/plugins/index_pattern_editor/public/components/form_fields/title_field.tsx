/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import {
  UseField,
  getFieldValidityAndErrorMessage,
  ValidationFunc,
  FieldConfig,
} from '../../shared_imports';
import { IndexPatternConfig } from '../index_pattern_editor_flyout_content';
import { canAppendWildcard } from '../../lib';
import { schema } from '../form_schema';

interface TitleFieldProps {
  existingIndexPatterns: string[];
}

const createTitlesNotAllowedValidator = (
  namesNotAllowed: string[]
): ValidationFunc<{}, string, string> => ({ value }) => {
  if (namesNotAllowed.includes(value)) {
    return {
      message: i18n.translate('indexPatternEditor.indexPatternExists.ValidationErrorMessage', {
        defaultMessage: 'An index pattern with this title already exists.',
      }),
    };
  }
};

const getTitleConfig = (namesNotAllowed: string[]): FieldConfig<string> => {
  const titleFieldConfig = schema.title;

  // Add validation to not allow duplicates
  return {
    ...titleFieldConfig!,
    validations: [
      ...(titleFieldConfig.validations ?? []),
      {
        validator: createTitlesNotAllowedValidator(namesNotAllowed),
      },
    ],
  };
};

export const TitleField = ({ existingIndexPatterns }: TitleFieldProps) => {
  const [appendedWildcard, setAppendedWildcard] = useState<boolean>(false);

  return (
    <UseField<string, IndexPatternConfig>
      path="title"
      config={getTitleConfig(existingIndexPatterns)}
      componentProps={{
        euiFieldProps: {
          'aria-label': i18n.translate('indexPatternEditor.form.titleAriaLabel', {
            defaultMessage: 'Title field',
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
              value={field.value as string}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                e.persist();
                let query = e.target.value;
                if (query.length === 1 && !appendedWildcard && canAppendWildcard(query)) {
                  query += '*';
                  setAppendedWildcard(true);
                  field.setValue(query);
                  setTimeout(() => e.target.setSelectionRange(1, 1));
                } else {
                  if (['', '*'].includes(query) && appendedWildcard) {
                    query = '';
                    setAppendedWildcard(false);
                  }
                  field.setValue(query);
                }
                // todo
                // setLastTitle(query);
              }}
              isLoading={field.isValidating}
              fullWidth
              data-test-subj="createIndexPatternNameInput"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
