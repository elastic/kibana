/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback } from 'react';
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
  RuntimePrimitiveTypes,
} from '../../shared_imports';
import { Field } from '../../types';
import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from '../preview';

import { RUNTIME_FIELD_OPTIONS } from './constants';
import { schema } from './form_schema';
import { getNameFieldConfig, getFieldPreviewChanges } from './lib';
import { TypeField } from './form_fields';
import { FieldDetail } from './field_detail';
import { CompositeEditor } from './composite_editor';
import { TypeSelection } from './types';
import { ChangeType } from '../preview/types';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<Field>['submit'];
}

export interface FieldFormInternal extends Omit<Field, 'type' | 'internalType' | 'fields'> {
  fields?: Record<string, { type: RuntimePrimitiveTypes }>;
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
  const { namesNotAllowed, fieldTypeToProcess, fieldName$, subfields$ } = useFieldEditorContext();
  const {
    params: { update: updatePreviewParams },
    fieldPreview$,
  } = useFieldPreviewContext();
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });

  const { submit, isValid: isFormValid, isSubmitted, getFields, isSubmitting } = form;

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

  // use observable to sidestep react state
  useEffect(() => {
    const sub = form.subscribe(({ data }) => {
      if (data.internal.name !== fieldName$.getValue()) {
        fieldName$.next(data.internal.name);
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [form, fieldName$]);

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

  const resetTypes = useCallback(() => {
    const lastVal = fieldPreview$.getValue();
    // resets the preview history to an empty set
    fieldPreview$.next([]);
    // apply the last preview to get all the types
    fieldPreview$.next(lastVal);
  }, [fieldPreview$]);

  useEffect(() => {
    const existingCompositeField = !!Object.keys(subfields$.getValue() || {}).length;

    const changes$ = getFieldPreviewChanges(fieldPreview$);

    const subChanges = changes$.subscribe((previewFields) => {
      const fields = subfields$.getValue();

      const modifiedFields = { ...fields };

      Object.entries(previewFields).forEach(([name, change]) => {
        if (change.changeType === ChangeType.DELETE) {
          delete modifiedFields[name];
        }
        if (change.changeType === ChangeType.UPSERT) {
          modifiedFields[name] = { type: change.type! };
        }
      });

      subfields$.next(modifiedFields);
      // necessary to maintain script code when changing types
      form.updateFieldValues({ ...form.getFormData() });
    });

    // first preview value is skipped for saved fields, need to populate for new fields and rerenders
    if (!existingCompositeField) {
      fieldPreview$.next([]);
    } else if (fieldPreview$.getValue()) {
      fieldPreview$.next(fieldPreview$.getValue());
    }

    return () => {
      subChanges.unsubscribe();
    };
  }, [form, fieldPreview$, subfields$]);

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
      parentName: field?.parentName,
    });
  }, [
    updatedName,
    updatedType,
    updatedScript,
    isValueVisible,
    updatedFormat,
    updatePreviewParams,
    field,
  ]);

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
        <CompositeEditor onReset={resetTypes} />
      )}
    </Form>
  );
};

export const FieldEditor = FieldEditorComponent as typeof FieldEditorComponent;
