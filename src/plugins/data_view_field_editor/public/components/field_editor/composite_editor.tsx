/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiNotificationBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiFieldText,
  EuiComboBox,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ScriptField } from './form_fields';
import { useFieldEditorContext } from '../field_editor_context';
import { RUNTIME_FIELD_OPTIONS_PRIMITIVE } from './constants';
import { valueToComboBoxOption } from './lib';

export interface CompositeEditorProps {
  value: Record<string, string>;
  setValue: (newValue: Record<string, string>) => void;
}

export const CompositeEditor = ({ value, setValue }: CompositeEditorProps) => {
  const { links, existingConcreteFields } = useFieldEditorContext();

  const fields = Object.entries(value);

  return (
    <div>
      <ScriptField existingConcreteFields={existingConcreteFields} links={links} />
      <EuiSpacer size="xl" />
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="indexPatternFieldEditor.editor.compositeFieldsCount"
                defaultMessage="Generated fields"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">{fields.length}</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        {Object.entries(value).map(([key, itemValue], idx) => {
          return (
            <div>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiFieldText value={key} disabled={true} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow fullWidth>
                    <EuiComboBox
                      placeholder={i18n.translate(
                        'indexPatternFieldEditor.editor.form.runtimeType.placeholderLabel',
                        {
                          defaultMessage: 'Select a type',
                        }
                      )}
                      singleSelection={{ asPlainText: true }}
                      options={RUNTIME_FIELD_OPTIONS_PRIMITIVE}
                      selectedOptions={[valueToComboBoxOption(itemValue)!]}
                      onChange={(newValue) => {
                        if (newValue.length === 0) {
                          // Don't allow clearing the type. One must always be selected
                          return;
                        }
                        // update the type for the given field
                        value[key] = newValue[0].value!;
                        // retun new object as to trigger react hooks
                        setValue({ ...value });
                      }}
                      isClearable={false}
                      data-test-subj={`typeField_${idx}`}
                      aria-label={i18n.translate(
                        'indexPatternFieldEditor.editor.form.typeSelectAriaLabel',
                        {
                          defaultMessage: 'Type select',
                        }
                      )}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          );
        })}
      </>
    </div>
  );
};
