/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import { ScriptField } from './form_fields';
import { useFieldEditorContext } from '../field_editor_context';
import { RUNTIME_FIELD_OPTIONS_PRIMITIVE } from './constants';
import { valueToComboBoxOption } from './lib';
import { RuntimePrimitiveTypes } from '../../shared_imports';

export interface CompositeEditorProps {
  onReset: () => void;
}

export const CompositeEditor = ({ onReset }: CompositeEditorProps) => {
  const { links, subfields$ } = useFieldEditorContext();
  const subfields = useObservable(subfields$) || {};

  return (
    <div data-test-subj="compositeEditor">
      <ScriptField links={links} placeholder={"emit('field_name', 'hello world');"} />
      <EuiSpacer size="xl" />
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
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
              <EuiNotificationBadge color="subdued">
                {Object.entries(subfields).length}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="right" iconType="refresh" onClick={onReset}>
              <FormattedMessage
                id="indexPatternFieldEditor.editor.compositeRefreshTypes"
                defaultMessage="Reset"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        {Object.entries(subfields).map(([key, itemValue], idx) => {
          return (
            <div key={key}>
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
                      selectedOptions={[valueToComboBoxOption(itemValue.type)!]}
                      onChange={(newValue) => {
                        if (newValue.length === 0) {
                          // Don't allow clearing the type. One must always be selected
                          return;
                        }
                        // update the type for the given field
                        subfields[key] = { type: newValue[0].value! as RuntimePrimitiveTypes };

                        subfields$.next({ ...subfields });
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
