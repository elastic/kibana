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
import { FormRow } from './form_row';
import { AdvancedParametersSection } from './advanced_parameters_section';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  submit: FormHook<Field>['submit'];
}

export interface FieldFormInternal extends Field {
  __meta__: {
    isCustomLabelVisible: boolean;
    isValueVisible: boolean;
    isFormatVisible: boolean;
  };
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

const geti18nTexts = () => ({
  customLabel: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.customLabelTitle', {
      defaultMessage: 'Set custom label',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.customLabelDescription', {
      defaultMessage: `Set a custom label to use when this field is displayed in Discover, Maps, and Visualize. Queries and filters don't currently support a custom label and will use the original field name.`,
    }),
  },
  value: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.valueTitle', {
      defaultMessage: 'Set value',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.valueDescription', {
      defaultMessage: `Define the value of the field. If you don't set the value, the value of the field will be retrieved from the field with the same name in the _source object.`,
    }),
  },
  format: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.formatTitle', {
      defaultMessage: 'Set format',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.formatDescription', {
      defaultMessage: `Formatting allows you to control the way that specific values are displayed. It can also cause values to be completely changed and prevent highlighting in Discover from working.`,
    }),
  },
});

const formDeserializer = (field: Field): FieldFormInternal => {
  return {
    ...field,
    __meta__: {
      isCustomLabelVisible: field.customLabel !== undefined,
      isValueVisible: field.script !== undefined,
      isFormatVisible: field.format !== undefined,
    },
  };
};

const formSerializer = (field: FieldFormInternal): Field => {
  const { __meta__, ...rest } = field;
  return rest;
};

const FieldEditorComponent = ({
  field,
  onChange,
  ctx: { namesNotAllowed, existingConcreteFields = [] } = {},
}: Props) => {
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });
  const { submit, isValid: isFormValid, isSubmitted } = form;
  const [{ name }] = useFormData<FieldFormInternal>({ form, watch: 'name' });

  const nameFieldConfig = getNameFieldConfig(namesNotAllowed, field);
  const isShadowingField = existingConcreteFields.find((_field) => _field.name === name);
  const i18nTexts = geti18nTexts();

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

      {/* Set custom label */}
      <FormRow
        title={i18nTexts.customLabel.title}
        description={i18nTexts.customLabel.description}
        formFieldPath="__meta__.isCustomLabelVisible"
      >
        <div>Block custom label</div>
      </FormRow>

      {/* Set value */}
      <FormRow
        title={i18nTexts.value.title}
        description={i18nTexts.value.description}
        formFieldPath="__meta__.isValueVisible"
      >
        <div>Block value (script)</div>
      </FormRow>

      {/* Set custom format */}
      <FormRow
        title={i18nTexts.format.title}
        description={i18nTexts.format.description}
        formFieldPath="__meta__.isFormatVisible"
      >
        <div>Block custom format</div>
      </FormRow>

      {/* Advanced settings */}
      <AdvancedParametersSection>
        <div>Placeholder for advanced settings</div>
      </AdvancedParametersSection>
    </Form>
  );
};

export const FieldEditor = React.memo(FieldEditorComponent);
