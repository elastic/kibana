/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiCallOut } from '@elastic/eui';

import {
  Form,
  useForm,
  useFormData,
  useFormIsModified,
  FormHook,
  UseField,
  TextField,
  RuntimeType,
  RuntimeFieldSubField,
  RuntimePrimitiveTypes,
} from '../../shared_imports';
import { Field } from '../../types';
import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from '../preview';

import { RUNTIME_FIELD_OPTIONS } from './constants';
import { schema } from './form_schema';
import { getNameFieldConfig } from './lib';
import { TypeField } from './form_fields';
import { FieldDetail } from './field_detail';
import { CompositeEditor } from './composite_editor';
import { TypeSelection } from './types';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<Field>['submit'];
}

export interface FieldFormInternal extends Omit<Field, 'type' | 'internalType' | 'fields'> {
  fields?: Array<{ name: string; type: TypeSelection }>;
  type: TypeSelection;
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

const changeWarning = i18n.translate('indexPatternFieldEditor.editor.form.changeWarning', {
  defaultMessage:
    'Changing name or type can break searches and visualizations that rely on this field.',
});

const fieldTypeToComboBoxOption = (type: Field['type']): TypeSelection => {
  if (type) {
    const label = RUNTIME_FIELD_OPTIONS.find(({ value }) => value === type)?.label;
    return [{ label: label ?? type, value: type as RuntimeType }];
  }
  return [RUNTIME_FIELD_OPTIONS[0]];
};

const formDeserializer = (field: Field): FieldFormInternal => {
  const fieldType = fieldTypeToComboBoxOption(field.type);

  const format = field.format === null ? undefined : field.format;

  console.log('DESERIALIZER', fieldType);
  console.log('DESERIALIZER', field.fields);
  return {
    ...field,
    type: fieldType,
    format,
    fields: field.fields
      ? Object.entries(field.fields).reduce<Array<{ name: string; type: TypeSelection }>>(
          (col, [key, val]) => {
            col.push({ name: key, type: fieldTypeToComboBoxOption(val.type) });
            return col;
          },
          []
        )
      : undefined,
    __meta__: {
      isCustomLabelVisible: field.customLabel !== undefined,
      isValueVisible: field.script !== undefined,
      isFormatVisible: field.format !== undefined,
      isPopularityVisible: field.popularity !== undefined,
    },
  };
};

const formSerializer = (field: FieldFormInternal): Field => {
  const { __meta__, type, format, fields, ...rest } = field;
  console.log('SERIALIZER', field);

  return {
    type: type && type[0].value!,
    // By passing "null" we are explicitly telling DataView to remove the
    // format if there is one defined for the field.
    format: format === undefined ? null : format,
    fields: fields
      ? fields.reduce<Record<string, RuntimeFieldSubField>>(
          (acc, { name, type: subfieldType = [{}] }) => {
            acc[name] = { type: (subfieldType[0].value || 'keyword') as RuntimePrimitiveTypes };
            return acc;
          },
          {}
        )
      : undefined,
    ...rest,
  };
};

const FieldEditorComponent = ({ field, onChange, onFormModifiedChange }: Props) => {
  console.log('FieldEditorComponent - this is rerendering too much');
  // todo - two initial sources, original field and preview
  const { namesNotAllowed, fieldTypeToProcess } = useFieldEditorContext();
  const {
    params: { update: updatePreviewParams },
    fields,
  } = useFieldPreviewContext();
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });
  const { submit, isValid: isFormValid, isSubmitted, getFields, isSubmitting } = form;

  console.log('SUBFIELDS', field?.fields);
  const savedSubfieldTypes = Object.entries(field?.fields || {}).reduce<Record<string, string>>(
    (col, [key, val]) => {
      col[key] = val.type;
      return col;
    },
    {}
  );
  const fieldsAndTypesDefault = fields.reduce<Record<string, string>>((collector, item) => {
    // todo remove ! and use correct type
    collector[item.key] = item.type!;
    return collector;
  }, {});

  console.log('DEEEEEFAULT', fieldsAndTypesDefault);
  // todo
  const [fieldsAndTypes, setFieldsAndTypes] = useState(savedSubfieldTypes);

  useEffect(() => {
    console.log('useEffect fieldsAndTypes', fieldsAndTypes);
  }, [fieldsAndTypes]);

  const nameFieldConfig = getNameFieldConfig(namesNotAllowed, field);

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
  // todo how to do this for composite fields?
  const nameHasChanged = (Boolean(field?.name) && nameField?.isModified) ?? false;
  const typeHasChanged = (Boolean(field?.type) && typeField?.isModified) ?? false;

  const isValueVisible = get(formData, '__meta__.isValueVisible');
  // const isRuntimeSubfield = field?.script.
  // form.setFieldValue('fields', [{ name: 'a', value: [{ label: 'keyword', type: 'keyword' }] }]);
  // form.setFieldValue('fields', { a: { type: 'keyword' } });
  // console.log('RENDER FORM', form.getFields());

  useEffect(() => {
    console.log('FIELDS HAVE BEEN UPDATED', fields);
    const previewFieldsToFormFields = fields.map((fld) => ({
      name: fld.key,
      value: [{ label: 'keyword', type: 'keyword' }],
    }));
    console.log('previewFieldsToFormFields', previewFieldsToFormFields);
    /*
    form.setFieldValue('fields__array__', [
      { name: 'a', value: [{ label: 'keyword', type: 'keyword' }] },
    ]);
    */
    form.setFieldValue('fields__array__', previewFieldsToFormFields);
    form.setFieldValue('TEST', 'TEST VALUE');
    console.log('SET FIELDS COMPLETE');
  }, [fields, form]);

  useEffect(() => {
    console.log('USE EFFECT ONCHANGE');
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, isSubmitting, submit });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit]);

  /*
  useEffect(() => {
    console.log('USE EFFECT updatePreviewParams');
    updatePreviewParams({
      name: Boolean(updatedName?.trim()) ? updatedName : null,
      type: updatedType?.[0].value,
      script:
        isValueVisible === false || Boolean(updatedScript?.source.trim()) === false
          ? null
          : { source: updatedScript!.source },
      format: updatedFormat?.id !== undefined ? updatedFormat : null,
    });
  }, [
    updatedName,
    updatedType,
    updatedScript?.source,
    isValueVisible,
    updatedFormat,
    updatePreviewParams,
  ]);
  */

  useEffect(() => {
    if (onFormModifiedChange) {
      onFormModifiedChange(isFormModified);
    }
  }, [isFormModified, onFormModifiedChange, form]);

  const formDataBest = form.getFormData();
  console.log(formDataBest);

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
          <TypeField
            isDisabled={fieldTypeToProcess === 'concrete'}
            includeComposite={true}
            path="type"
          />
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
      {field?.parentName && (
        <>
          <EuiCallOut
            iconType="iInCircle"
            title={i18n.translate('indexPatternFieldEditor.editor.form.subFieldParentInfo', {
              defaultMessage: "Field value is defined by '{parentName}'",
              values: { parentName: field?.parentName },
            })}
          />
          <EuiSpacer size="xl" />
        </>
      )}
      {updatedType && updatedType[0].value !== 'composite' ? (
        <FieldDetail />
      ) : (
        <CompositeEditor
          value={fieldsAndTypes}
          setValue={(update) => {
            console.log('got update', update);
            setFieldsAndTypes(update);
          }}
        />
      )}
    </Form>
  );
};

export const FieldEditor = FieldEditorComponent as typeof FieldEditorComponent;
