/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { Form, useForm, FormHook, UseField, TextField, useFormData } from '../../shared_imports';
import { Field } from '../../types';

import { schema } from './form_schema';
import { getNameFieldConfig } from './lib';
import { ShadowingFieldWarning } from './shadowing_field_warning';
import { TypeField } from './form_fields';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  submit: FormHook<Field>['submit'];
}

export interface Props {
  /** Link URLs to our doc site */
  links: {
    runtimePainless: string;
  };
  /** Optional field to edit */
  field?: Field;
  /** Handler to receive state changes updates */
  onChange?: (state: FieldEditorFormState) => void;
  /** Optional context object */
  ctx?: {
    /**
     * An array of field names not allowed.
     * e.g we probably don't want a user to give a name of an existing
     * runtime field (for that the user should edit the existing runtime field).
     */
    namesNotAllowed?: string[];
    /**
     * An array of existing concrete fields. If the user gives a name to the runtime
     * field that matches one of the concrete fields, a callout will be displayed
     * to indicate that this runtime field will shadow the concrete field.
     * It is also used to provide the list of field autocomplete suggestions to the code editor.
     */
    existingConcreteFields?: Field[];
  };
}

const FieldEditorComponent = ({
  field,
  onChange,
  ctx: { namesNotAllowed, existingConcreteFields = [] } = {},
}: Props) => {
  const { form } = useForm<Field>({ defaultValue: field, schema });
  const { submit, isValid: isFormValid, isSubmitted } = form;
  const [{ name }] = useFormData<Field>({ form, watch: 'name' });

  const nameFieldConfig = getNameFieldConfig(namesNotAllowed, field);
  const isShadowingField = existingConcreteFields.find((_field) => _field.name === name);

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, submit });
    }
  }, [onChange, isFormValid, isSubmitted, submit]);

  return (
    <Form form={form} className="indexPatternFieldEditor__form">
      <EuiFlexGroup>
        {/* Name */}
        <EuiFlexItem>
          <UseField<string, Field>
            path="name"
            config={nameFieldConfig}
            component={TextField}
            data-test-subj="nameField"
            componentProps={{
              euiFieldProps: {
                'aria-label': i18n.translate('indexPatternFieldEditor.editor.form.nameAriaLabel', {
                  defaultMessage: 'Name field',
                }),
              },
            }}
          />
        </EuiFlexItem>

        {/* Type */}
        <EuiFlexItem>
          <TypeField />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isShadowingField && (
        <>
          <EuiSpacer />
          <ShadowingFieldWarning />
        </>
      )}

      <EuiSpacer size="l" />
    </Form>
  );
};

export const FieldEditor = React.memo(FieldEditorComponent);
