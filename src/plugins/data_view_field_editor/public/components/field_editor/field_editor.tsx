/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { get, isEqual, differenceWith } from 'lodash';
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
import { TypeSelection, FieldTypeInfo } from './types';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<Field>['submit'];
}

export interface FieldFormInternal extends Omit<Field, 'type' | 'internalType' | 'fields'> {
  // todo - remove? Had trouble with this
  // fields?: Array<{ name: string; type: TypeSelection }>;
  type: TypeSelection;
  __meta__: {
    isCustomLabelVisible: boolean;
    isValueVisible: boolean;
    isFormatVisible: boolean;
    isPopularityVisible: boolean;
  };
}

export interface Props {
  /** Optional field to edit or preselected field to create */
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

  return {
    ...field,
    type: fieldType,
    format,
    __meta__: {
      isCustomLabelVisible: field.customLabel !== undefined,
      isValueVisible: field.script !== undefined,
      isFormatVisible: field.format !== undefined,
      isPopularityVisible: field.popularity !== undefined,
    },
  };
};

const formSerializer = (field: FieldFormInternal): Field => {
  const { __meta__, type, format, ...rest } = field;
  return {
    type: type && type[0].value!,
    // By passing "null" we are explicitly telling DataView to remove the
    // format if there is one defined for the field.
    format: format === undefined ? null : format,
    ...rest,
  };
};

const FieldEditorComponent = ({ field, onChange, onFormModifiedChange }: Props) => {
  // todo see if we can reduce renders
  const { namesNotAllowed, fieldTypeToProcess, setSubfields } = useFieldEditorContext();
  const {
    params: { update: updatePreviewParams },
    fields,
    isLoadingPreview,
    initialPreviewComplete,
  } = useFieldPreviewContext();
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });
  const [fieldTypeInfo, setFieldTypeInfo] = useState<FieldTypeInfo[]>();
  const { submit, isValid: isFormValid, isSubmitted, getFields, isSubmitting } = form;

  // loading from saved field
  const savedSubfieldTypes = Object.entries(field?.fields || {}).reduce<Record<string, string>>(
    (col, [key, val]) => {
      col[key] = val.type;
      return col;
    },
    {}
  );

  const [fieldsAndTypes, setFieldsAndTypes] = useState(savedSubfieldTypes);

  /*
  useEffect(() => {
    setSubfields(fieldsAndTypes);
  }, [fieldsAndTypes, setSubfields]);
  */

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

  useEffect(() => {
    if (isLoadingPreview || initialPreviewComplete) {
      return;
    }
    // Take preview info, remove unneeded info for updating types, comparison
    const fieldTypeInfoUpdate = fields
      .reverse()
      // sometimes we get null types, remove them
      .filter((item) => item.type !== undefined)
      .map<FieldTypeInfo>((item) => {
        const key = item.key.slice(item.key.search('\\.') + 1);
        return { name: key, type: item.type! };
      });

    const update = differenceWith(fieldTypeInfoUpdate, fieldTypeInfo || [], isEqual).reduce<
      Record<string, string>
    >((col, item) => {
      col[item.name] = item.type;
      return col;
    }, {});

    const hasUpdates = Object.keys(update).length > 0;

    // todo ensure works on opening saved field
    // skip first update from initial preview, only update when there's a difference
    // if (fieldTypeInfo === undefined || !isEqual(fieldTypeInfoUpdate, fieldTypeInfo)) {

    // todo does this get fired with key removal?
    if (hasUpdates) {
      // form.updateFieldValues({ subfields: { ...fieldsAndTypes, ...update } });
      const updatedFieldsAndTypes = { ...fieldsAndTypes, ...update };
      setFieldsAndTypes(updatedFieldsAndTypes);
      setFieldTypeInfo(fieldTypeInfoUpdate);
      setSubfields(updatedFieldsAndTypes as Record<string, RuntimePrimitiveTypes>);
    }
  }, [
    fields,
    isLoadingPreview,
    initialPreviewComplete,
    fieldsAndTypes,
    fieldTypeInfo,
    setSubfields /* , form */,
  ]);

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
          : { source: updatedScript!.source },
      format: updatedFormat?.id !== undefined ? updatedFormat : null,
    });
  }, [updatedName, updatedType, updatedScript, isValueVisible, updatedFormat, updatePreviewParams]);

  useEffect(() => {
    if (onFormModifiedChange) {
      onFormModifiedChange(isFormModified);
    }
  }, [isFormModified, onFormModifiedChange, form]);

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
        // todo rename these subfields
        <CompositeEditor value={fieldsAndTypes} setValue={setFieldsAndTypes} />
      )}
    </Form>
  );
};

export const FieldEditor = FieldEditorComponent as typeof FieldEditorComponent;
