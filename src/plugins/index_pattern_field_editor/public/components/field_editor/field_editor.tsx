/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React, { useEffect } from 'react';
// import { isArray } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiComboBoxOptionOption } from '@elastic/eui';
import type { CoreStart } from 'src/core/public';

import {
  Form,
  useForm,
  FormHook,
  UseField,
  TextField,
  useFormData,
  RuntimeType,
  IndexPattern,
  DataPublicPluginStart,
} from '../../shared_imports';
import { Field, InternalFieldType, PluginStart } from '../../types';

import { RUNTIME_FIELD_OPTIONS } from './constants';
import { schema } from './form_schema';
import { getNameFieldConfig } from './lib';
import { ShadowingFieldWarning } from './shadowing_field_warning';
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
  /** Link URLs to our doc site */
  links: {
    runtimePainless: string;
  };
  /** Optional field to edit */
  field?: Field;
  /** Handler to receive state changes updates */
  onChange?: (state: FieldEditorFormState) => void;
  indexPattern: IndexPattern;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  uiSettings: CoreStart['uiSettings'];
  /** Context object */
  ctx: {
    /** The internal field type we are dealing with (concrete|runtime)*/
    fieldTypeToProcess: InternalFieldType;
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
    existingConcreteFields?: Array<{ name: string; type: string }>;
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
  popularity: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.popularityTitle', {
      defaultMessage: 'Set popularity',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.popularityDescription', {
      defaultMessage: `By default fields in Discover are ordered from the most used fields to the least used. Each time a field is selected its popularity increases. You can manually set here the popularity of the field.`,
    }),
  },
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

const FieldEditorComponent = ({
  field,
  onChange,
  links,
  indexPattern,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
  ctx: { fieldTypeToProcess, namesNotAllowed, existingConcreteFields = [] },
}: Props) => {
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });
  const { submit, isValid: isFormValid, isSubmitted } = form;
  const [{ name }] = useFormData<FieldFormInternal>({ form, watch: ['name'] });

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

      {isShadowingField && (
        <>
          <EuiSpacer />
          <ShadowingFieldWarning />
        </>
      )}

      <EuiSpacer size="xl" />

      {/* Set custom label */}
      <FormRow
        title={i18nTexts.customLabel.title}
        description={i18nTexts.customLabel.description}
        formFieldPath="__meta__.isCustomLabelVisible"
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
        withDividerRule
      >
        {/** type need to be set to kbn type, esTypes need to be set */}
        <FormatField
          indexPattern={indexPattern}
          fieldFormatEditors={fieldFormatEditors}
          fieldFormats={fieldFormats}
          uiSettings={uiSettings}
        />
      </FormRow>

      {/* Advanced settings */}
      <AdvancedParametersSection>
        <FormRow
          title={i18nTexts.popularity.title}
          description={i18nTexts.popularity.description}
          formFieldPath="__meta__.isPopularityVisible"
          withDividerRule
        >
          <PopularityField />
        </FormRow>
      </AdvancedParametersSection>
    </Form>
  );
};

export const FieldEditor = React.memo(FieldEditorComponent);
