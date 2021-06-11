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

import { UseField } from '../../shared_imports';

import { TimestampOption } from '../index_pattern_editor_flyout_content';

interface Props {
  isDisabled?: boolean;
  options: TimestampOption[];
}

export const TimestampField = ({ isDisabled = false, options = [] }: Props) => {
  const optionsAsComboBoxOptions = options.map(({ display, fieldName }) => ({
    label: display,
    value: fieldName,
  }));

  return (
    <UseField<string> path="timestampField">
      {({ label, value, setValue }) => {
        if (value === undefined) {
          return null;
        }
        return (
          <>
            <EuiFormRow label={label} fullWidth>
              <EuiComboBox<string>
                placeholder={i18n.translate(
                  'indexPatternEditor.editor.form.runtimeType.placeholderLabel',
                  {
                    defaultMessage: 'Select a timestamp field',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={optionsAsComboBoxOptions}
                selectedOptions={[{ label: value }]}
                onChange={(newValue) => {
                  if (newValue.length === 0) {
                    // Don't allow clearing the type. One must always be selected
                    return;
                  }
                  //
                  setValue(newValue[0].label);
                }}
                isClearable={false}
                isDisabled={isDisabled}
                data-test-subj="timestampField"
                aria-label={i18n.translate('indexPatternEditor.editor.form.typeSelectAriaLabel', {
                  defaultMessage: 'Timestamp field',
                })}
                fullWidth
              />
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};
