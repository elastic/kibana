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
import { ScriptField } from './form_fields';
import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from '../preview';
import { RUNTIME_FIELD_OPTIONS_PRIMITIVE } from './constants';

export interface CompositeEditorProps {
  value: Record<string, string>;
  setValue: (newValue: Record<string, string>) => void;
}

export const CompositeEditor = ({ value, setValue }: CompositeEditorProps) => {
  const { links, existingConcreteFields } = useFieldEditorContext();
  // const { fields } = useFieldPreviewContext();
  if (value?.a === undefined) {
    value = { a: 'keyword' };
  }
  console.log('CompositeEditor VALUE ', value);
  const fields = Object.entries(value);
  // const { fields } = useFieldPreviewContext();
  // const names = fields.map((field) => field.key);
  // console.log('fields from context', fields);
  // what I want to do -
  // 1. get list of fields
  // 2. get types from `fields` in context

  /**
                       <UseField
                      path={`fields[${idx}].name`}
                      componentProps={{
                        euiFieldProps: { disabled: true },
                      }}
                      component={TextField}
                      defaultValue={key}
                      key={key}
                    />

                    <TypeField
                      path={`fields[${idx}].type`}
                      key={key + item.type}
                      // todo - do this better
                      // defaultValue={{ label: item.type, value: item.type }}
                      defaultValue={RUNTIME_FIELD_OPTIONS_PRIMITIVE.find(
                        ({ value }) => value === item.type
                      )}
                    />

   */
  return (
    <div>
      <ScriptField existingConcreteFields={existingConcreteFields} links={links} />
      <EuiSpacer size="xl" />
      <>
        <div>
          <EuiText size="s">
            Generated fields{' '}
            <EuiNotificationBadge color="subdued">{fields.length}</EuiNotificationBadge>
          </EuiText>
        </div>
        {Object.entries(value)
          // .filter(([key, val]) => val !== undefined)
          .map(([key, itemValue], idx) => {
            // const key = itemKey.slice(itemKey.search('\\.') + 1);
            const val = RUNTIME_FIELD_OPTIONS_PRIMITIVE.find(
              ({ value: optionValue }) => optionValue === itemValue // || 'keyword'
            );

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
                        selectedOptions={[val!]}
                        onChange={(newValue) => {
                          console.log('start onchange');
                          if (newValue.length === 0) {
                            // Don't allow clearing the type. One must always be selected
                            return;
                          }
                          value[key] = newValue[0].value!;
                          console.log('I AM SAVING NEW VALUE', value);
                          setValue({ ...value });
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
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            );
          })}
      </>
    </div>
  );
};

/**
 *       <UseArray path="fields">
        {(fieldsArray) => {
          console.log('FIELDS ARRAY', fieldsArray);
          return <></>;
        }}
      </UseArray>
 */

/**

 <UseArray path="fields">
        {({ form }) => {
          console.log('Render subfield list', fields);
          const formatFields = fields.reduce((collector, field) => {

            // const splitIntoSegments = field.key.split('.');
            // splitIntoSegments.shift();
            // const key = field.key.split('.').shift()?.join('.');

            const key = field.key.slice(field.key.search('\\.') + 1);
            // collector[key] = [{ type: field.type || 'keyword' }];
            collector[key] = [{ type: field.type }];
            return collector;
          }, {} as Record<string, Array<{ type: string }>>);
          // Record<string, { type: string }[]>
          // console.log('formatFields', formatFields, fields);
          // form.setFieldValue('fields', formatFields);
          return (
            <>
              <div>
                <EuiText size="s">
                  Generated fields{' '}
                  <EuiNotificationBadge color="subdued">{fields.length}</EuiNotificationBadge>
                </EuiText>
              </div>
              {fields
                .filter(({ value }) => value !== undefined)
                .map((item, idx) => {
                  const key = item.key.slice(item.key.search('\\.') + 1);
                  return (
                    <div>
                      <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem>
                          <UseField
                            path={`fields[${idx}].name`}
                            componentProps={{
                              euiFieldProps: { disabled: true },
                            }}
                            component={TextField}
                            defaultValue={key}
                            key={key}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TypeField
                            path={`fields[${idx}].type`}
                            key={key + item.type}
                            // todo - do this better
                            // defaultValue={{ label: item.type, value: item.type }}
                            defaultValue={RUNTIME_FIELD_OPTIONS_PRIMITIVE.find(
                              ({ value }) => value === item.type
                            )}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  );
                })}
            </>
          );
        }}
      </UseArray>


 */
