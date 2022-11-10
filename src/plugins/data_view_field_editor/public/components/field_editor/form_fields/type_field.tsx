/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiComboBox } from '@elastic/eui';

import { UseField } from '../../../shared_imports';
import { RUNTIME_FIELD_OPTIONS, RUNTIME_FIELD_OPTIONS_PRIMITIVE } from '../constants';
import { TypeSelection } from '../types';

interface Props {
  isDisabled?: boolean;
  includeComposite?: boolean;
  path: string;
  defaultValue?: TypeSelection;
}

export const TypeField = ({
  isDisabled = false,
  includeComposite,
  path,
  defaultValue = [RUNTIME_FIELD_OPTIONS_PRIMITIVE[0]],
}: Props) => {
  return (
    <UseField<TypeSelection> path={path}>
      {({ label, value, setValue }) => {
        if (value === undefined) {
          return null;
        }
        return (
          <>
            <EuiFormRow label={label} fullWidth>
              <EuiComboBox
                placeholder={i18n.translate(
                  'indexPatternFieldEditor.editor.form.runtimeType.placeholderLabel',
                  {
                    defaultMessage: 'Select a type',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={includeComposite ? RUNTIME_FIELD_OPTIONS : RUNTIME_FIELD_OPTIONS_PRIMITIVE}
                selectedOptions={value || defaultValue}
                onChange={(newValue) => {
                  if (newValue.length === 0) {
                    // Don't allow clearing the type. One must always be selected
                    return;
                  }
                  setValue(newValue);
                }}
                isClearable={false}
                isDisabled={isDisabled}
                data-test-subj="typeField"
                aria-label={i18n.translate(
                  'indexPatternFieldEditor.editor.form.typeSelectAriaLabel',
                  {
                    defaultMessage: 'Type select',
                  }
                )}
                fullWidth
              />
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};
