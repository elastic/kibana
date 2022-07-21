/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiNotificationBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { ScriptField } from './form_fields';
import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from '../preview';
import { UseArray, UseField, TextField } from '../../shared_imports';
import { TypeField } from './form_fields';
import { RUNTIME_FIELD_OPTIONS_PRIMITIVE } from './constants';

export const CompositeEditor = ({}) => {
  const { links, existingConcreteFields } = useFieldEditorContext();
  const { fields } = useFieldPreviewContext();
  // const { fields } = useFieldPreviewContext();
  // const names = fields.map((field) => field.key);
  // console.log('fields from context', fields);
  // what I want to do -
  // 1. get list of fields
  // 2. get types from `fields` in context

  return (
    <div>
      <ScriptField existingConcreteFields={existingConcreteFields} links={links} />
      <EuiSpacer size="xl" />
      <UseArray path="fields">
        {({ form }) => {
          console.log('Render subfield list', fields);
          const formatFields = fields.reduce((collector, field) => {
            /*
            const splitIntoSegments = field.key.split('.');
            splitIntoSegments.shift();
            const key = field.key.split('.').shift()?.join('.');
            */
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
    </div>
  );
};
