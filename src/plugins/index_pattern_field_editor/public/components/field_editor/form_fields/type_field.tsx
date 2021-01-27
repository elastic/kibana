/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { UseField, RuntimeType } from '../../../shared_imports';
import { RUNTIME_FIELD_OPTIONS } from '../constants';

export const TypeField = () => {
  const onTypeChange = useCallback((newType: Array<EuiComboBoxOptionOption<RuntimeType>>) => {
    // setPainlessContext(mapReturnTypeToPainlessContext(newType[0]!.value!));
  }, []);

  return (
    <UseField<Array<EuiComboBoxOptionOption<RuntimeType>>> path="type" onChange={onTypeChange}>
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
                options={RUNTIME_FIELD_OPTIONS}
                selectedOptions={value}
                onChange={(newValue) => {
                  if (newValue.length === 0) {
                    // Don't allow clearing the type. One must always be selected
                    return;
                  }
                  setValue(newValue);
                }}
                isClearable={false}
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
