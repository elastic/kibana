/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiComboBoxOptionOption,
  EuiCode,
  EuiCallOut,
} from '@elastic/eui';

import {
  Form,
  useForm,
  useFormData,
  useFormIsModified,
  FormHook,
  UseField,
  TextField,
  RuntimeType,
} from '../../shared_imports';
import { Field } from '../../types';
import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from '../preview';

import { RUNTIME_FIELD_OPTIONS } from './constants';
import { schema } from './form_schema';
import { getNameFieldConfig } from './lib';
import {
  TypeField,
  CustomLabelField,
  ScriptField,
  FormatField,
  PopularityField,
} from './form_fields';
import { FormRow } from './form_row';
import { AdvancedParametersSection } from './advanced_parameters_section';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<Field>['submit'];
}

export interface FieldFormInternal extends Omit<Field, 'type' | 'internalType'> {
  type: Array<EuiComboBoxOptionOption<RuntimeType>>;
  __meta__: {
    isCustomLabelVisible: boolean;
    isValueVisible: boolean;
    isFormatVisible: boolean;
    isPopularityVisible: boolean;
  };
}

export interface Props {
  /** Optional field to edit */
  field?: Field;
  /** Handler to receive state changes updates */
  onChange?: (state: FieldEditorFormState) => void;
  /** Handler to receive update on the form "isModified" state */
  onFormModifiedChange?: (isModified: boolean) => void;
}

const geti18nTexts = (): {
  [key: string]: { title: string; description: JSX.Element | string };
} => ({
  customLabel: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.customLabelTitle', {
      defaultMessage: 'Set custom label',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.customLabelDescription', {
      defaultMessage: `Create a label to display in place of the field name in Discover, Maps, and Visualize. Useful for shortening a long field name.  Queries and filters use the original field name.`,
    }),
  },
  value: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.valueTitle', {
      defaultMessage: 'Set value',
    }),
    description: (
      <FormattedMessage
        id="indexPatternFieldEditor.editor.form.valueDescription"
        defaultMessage="Set a value for the field instead of retrieving it from the field with the same name in {source}."
        values={{
          source: <EuiCode>{'_source'}</EuiCode>,
        }}
      />
    ),
  },
  format: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.formatTitle', {
      defaultMessage: 'Set format',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.formatDescription', {
      defaultMessage: `Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.`,
    }),
  },
  popularity: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.popularityTitle', {
      defaultMessage: 'Set popularity',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.popularityDescription', {
      defaultMessage: `Adjust the popularity to make the field appear higher or lower in the fields list.  By default, Discover orders fields from most selected to least selected.`,
    }),
  },
});

const changeWarning = i18n.translate('indexPatternFieldEditor.editor.form.changeWarning', {
  defaultMessage:
    'Changing name or type can break searches and visualizations that rely on this field.',
});

const formDeserializer = (field: Field): FieldFormInternal => {
  let fieldType: Array<EuiComboBoxOptionOption<RuntimeType>>;
  if (!field.type) {
    fieldType = [RUNTIME_FIELD_OPTIONS[0]];
  } else {
    const label = RUNTIME_FIELD_OPTIONS.find(({ value }) => value === field.type)?.label;
    fieldType = [{ label: label ?? field.type, value: field.type as RuntimeType }];
  }

  return {
    ...field,
    type: fieldType,
    __meta__: {
      isCustomLabelVisible: field.customLabel !== undefined,
      isValueVisible: field.script !== undefined,
      isFormatVisible: field.format !== undefined,
      isPopularityVisible: field.popularity !== undefined,
    },
  };
};

const formSerializer = (field: FieldFormInternal): Field => {
  const { __meta__, type, ...rest } = field;
  return {
    type: type[0].value!,
    ...rest,
  };
};

const FieldEditorComponent = ({ field, onChange, onFormModifiedChange }: Props) => {
  const { links, namesNotAllowed, existingConcreteFields, fieldTypeToProcess } =
    useFieldEditorContext();
  const {
    params: { update: updatePreviewParams },
  } = useFieldPreviewContext();
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });
  const { submit, isValid: isFormValid, isSubmitted, getFields, isSubmitting } = form;

  const nameFieldConfig = getNameFieldConfig(namesNotAllowed, field);
  const i18nTexts = geti18nTexts();

  const [formData] = useFormData<FieldFormInternal>({ form });
  const isFormModified = useFormIsModified({
    form,
    discard: [
      '__meta__.isCustomLabelVisible',
      '__meta__.isValueVisible',
      '__meta__.isFormatVisible',
      '__meta__.isPopularityVisible',
    ],
  });

  const {
    name: updatedName,
    type: updatedType,
    script: updatedScript,
    format: updatedFormat,
  } = formData;
  const { name: nameField, type: typeField } = getFields();
  const nameHasChanged = (Boolean(field?.name) && nameField?.isModified) ?? false;
  const typeHasChanged = (Boolean(field?.type) && typeField?.isModified) ?? false;

  const isValueVisible = get(formData, '__meta__.isValueVisible');

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, isSubmitting, submit });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit]);

  useEffect(() => {
    updatePreviewParams({
      name: Boolean(updatedName?.trim()) ? updatedName : null,
      type: updatedType?.[0].value,
      script:
        isValueVisible === false || Boolean(updatedScript?.source.trim()) === false
          ? null
          : updatedScript,
      format: updatedFormat?.id !== undefined ? updatedFormat : null,
    });
  }, [updatedName, updatedType, updatedScript, isValueVisible, updatedFormat, updatePreviewParams]);

  useEffect(() => {
    if (onFormModifiedChange) {
      onFormModifiedChange(isFormModified);
    }
  }, [isFormModified, onFormModifiedChange]);

  return (
    <Form
      form={form}
      className="indexPatternFieldEditor__form"
      data-test-subj="indexPatternFieldEditorForm"
      isInvalid={isSubmitted && isFormValid === false}
      error={form.getErrors()}
    >
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
                disabled: fieldTypeToProcess === 'concrete',
                'aria-label': i18n.translate('indexPatternFieldEditor.editor.form.nameAriaLabel', {
                  defaultMessage: 'Name field',
                }),
              },
            }}
          />
        </EuiFlexItem>

        {/* Type */}
        <EuiFlexItem>
          <TypeField isDisabled={fieldTypeToProcess === 'concrete'} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {(nameHasChanged || typeHasChanged) && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            color="warning"
            title={changeWarning}
            iconType="alert"
            size="s"
            data-test-subj="changeWarning"
          />
        </>
      )}
      <EuiSpacer size="xl" />

      {/* Set custom label */}
      <FormRow
        title={i18nTexts.customLabel.title}
        description={i18nTexts.customLabel.description}
        formFieldPath="__meta__.isCustomLabelVisible"
        data-test-subj="customLabelRow"
        withDividerRule
      >
        <CustomLabelField />
      </FormRow>

      {/* Set value */}
      {fieldTypeToProcess === 'runtime' && (
        <FormRow
          title={i18nTexts.value.title}
          description={i18nTexts.value.description}
          formFieldPath="__meta__.isValueVisible"
          data-test-subj="valueRow"
          withDividerRule
        >
          <ScriptField existingConcreteFields={existingConcreteFields} links={links} />
        </FormRow>
      )}

      {/* Set custom format */}
      <FormRow
        title={i18nTexts.format.title}
        description={i18nTexts.format.description}
        formFieldPath="__meta__.isFormatVisible"
        data-test-subj="formatRow"
        withDividerRule
      >
        <FormatField />
      </FormRow>

      {/* Advanced settings */}
      <AdvancedParametersSection>
        <FormRow
          title={i18nTexts.popularity.title}
          description={i18nTexts.popularity.description}
          formFieldPath="__meta__.isPopularityVisible"
          data-test-subj="popularityRow"
          withDividerRule
        >
          <PopularityField />
        </FormRow>
      </AdvancedParametersSection>
    </Form>
  );
};

export const FieldEditor = React.memo(FieldEditorComponent) as typeof FieldEditorComponent;
