/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import type {
  FieldDefinition,
  SettingType,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';

import {
  isArrayFieldDefinition,
  isBooleanFieldDefinition,
  isColorFieldDefinition,
  isImageFieldDefinition,
  isJsonFieldDefinition,
  isMarkdownFieldDefinition,
  isNumberFieldDefinition,
  isSelectFieldDefinition,
  isStringFieldDefinition,
  isUndefinedFieldDefinition,
} from '@kbn/management-settings-field-definition';

import {
  isArrayFieldUnsavedChange,
  isBooleanFieldUnsavedChange,
  isColorFieldUnsavedChange,
  isImageFieldUnsavedChange,
  isJsonFieldUnsavedChange,
  isMarkdownFieldUnsavedChange,
  isNumberFieldUnsavedChange,
  isSelectFieldUnsavedChange,
  isStringFieldUnsavedChange,
  isUndefinedFieldUnsavedChange,
} from '@kbn/management-settings-field-definition/is';

import { getInputValue } from '@kbn/management-settings-utilities';

import {
  BooleanInput,
  CodeEditorInput,
  ColorPickerInput,
  ImageInput,
  NumberInput,
  SelectInput,
  TextInput,
  ArrayInput,
  TextInputProps,
} from './input';

import { OnChangeFn } from './types';

/**
 * Props for a {@link FieldInput} component.
 */
export interface FieldInputProps<T extends SettingType> {
  field: FieldDefinition<T>;
  unsavedChange?: UnsavedFieldChange<T>;
  onChange: OnChangeFn<T>;
  isDisabled: boolean;
}

/**
 * Build and return an `Error` if the type of the {@link UnsavedFieldChange} does not
 * match the type of the {@link FieldDefinition}.
 */
const getMismatchError = (type: SettingType, unsavedType?: SettingType) =>
  new Error(`Unsaved change for ${type} mismatch: ${unsavedType}"`);

/**
 * A component that renders an input field to manipulate the value of a
 * {@link FieldDefinition}.
 */
export const FieldInput = <T extends SettingType>({
  field,
  unsavedChange,
  isDisabled = false,
  onChange: onChangeProp,
}: FieldInputProps<T>) => {
  const { id, name, ariaAttributes } = field;

  const props = {
    ...ariaAttributes,
    id,
    isDisabled,
    name,
  };

  // These checks might seem excessive or redundant, but they are necessary to ensure that
  // the types are honored correctly using type guards.  These checks get compiled down to
  // checks against the `type` property-- which we were doing in the previous code, albeit
  // in an unenforceable way.
  //
  // Based on the success of a check, we can render the `FieldInput` in a indempotent and
  // type-safe way.
  //
  if (isArrayFieldDefinition(field)) {
    // If the composing component mistakenly provides an incompatible `UnsavedFieldChange`,
    // we can throw an `Error`.  We might consider switching to a `console.error` and not
    // rendering the input, but that might be less helpful.
    if (!isArrayFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);

    // This is a safe cast because we've already checked that the type is correct in both
    // the `FieldDefinition` and the `UnsavedFieldChange`... no need for a further
    // type guard.
    const onChange = onChangeProp as OnChangeFn<'array'>;

    return <ArrayInput {...{ ...props, onChange, value }} />;
  }

  if (isBooleanFieldDefinition(field)) {
    if (!isBooleanFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'boolean'>;

    return <BooleanInput {...{ ...props, onChange, value }} />;
  }

  if (isColorFieldDefinition(field)) {
    if (!isColorFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'color'>;

    return <ColorPickerInput {...{ ...props, onChange, value }} />;
  }

  if (isImageFieldDefinition(field)) {
    if (!isImageFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value, unsaved] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'image'>;

    return (
      <ImageInput
        {...{ ...props, onChange, value }}
        isDefaultValue={field.isDefaultValue}
        hasChanged={unsaved}
      />
    );
  }

  if (isJsonFieldDefinition(field)) {
    if (!isJsonFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'json'>;

    return (
      <CodeEditorInput
        {...{ ...props, onChange, value }}
        type="json"
        defaultValue={field.savedValue || ''}
      />
    );
  }

  if (isMarkdownFieldDefinition(field)) {
    if (!isMarkdownFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'markdown'>;

    return (
      <CodeEditorInput
        {...{ ...props, onChange, value }}
        type="markdown"
        defaultValue={field.savedValue || ''}
      />
    );
  }

  if (isNumberFieldDefinition(field)) {
    if (!isNumberFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'number'>;

    return <NumberInput {...{ ...props, onChange, value }} />;
  }

  if (isSelectFieldDefinition(field)) {
    if (!isSelectFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'select'>;
    const {
      options: { values: optionValues, labels: optionLabels },
    } = field;

    return <SelectInput {...{ ...props, onChange, optionLabels, optionValues, value }} />;
  }

  if (isStringFieldDefinition(field)) {
    if (!isStringFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    const onChange = onChangeProp as OnChangeFn<'string'>;

    return <TextInput {...{ ...props, onChange, value }} />;
  }

  if (isUndefinedFieldDefinition(field)) {
    if (!isUndefinedFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const [value] = getInputValue(field, unsavedChange);
    return <TextInput {...{ ...(props as unknown as TextInputProps), value }} />;
  }

  throw new Error(`Unknown or incompatible field type: ${field.type}`);
};
