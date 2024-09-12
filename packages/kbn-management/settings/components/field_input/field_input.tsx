/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useImperativeHandle, useRef } from 'react';

import type {
  FieldDefinition,
  OnInputChangeFn,
  ResetInputRef,
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

import {
  BooleanInput,
  CodeEditorInput,
  ColorPickerInput,
  ImageInput,
  NumberInput,
  SelectInput,
  TextInput,
  ArrayInput,
} from './input';

/**
 * The props that are passed to the {@link FieldInput} component.
 */
export interface FieldInputProps<T extends SettingType = SettingType> {
  /** The {@link FieldDefinition} for the component. */
  field: Pick<FieldDefinition<T>, 'type' | 'id' | 'name' | 'ariaAttributes'>;
  /** An {@link UnsavedFieldChange} for the component, if any. */
  unsavedChange?: UnsavedFieldChange<T>;
  /** The `onInputChange` handler for the input. */
  onInputChange: OnInputChangeFn<T>;
  /** True if the input can be saved, false otherwise. */
  isSavingEnabled: boolean;
  /** True if the value within the input is invalid, false otherwise. */
  isInvalid?: boolean;
}

/**
 * Build and return an `Error` if the type of the {@link UnsavedFieldChange} does not
 * match the type of the {@link FieldDefinition}.
 */
const getMismatchError = (type: SettingType, unsavedType?: SettingType) =>
  new Error(`Unsaved change for ${type} mismatch: ${unsavedType}`);

/**
 * An input that allows one to change a setting in Kibana.
 *
 * @param props The props for the {@link FieldInput} component.
 */
export const FieldInput = React.forwardRef<ResetInputRef, FieldInputProps>((props, ref) => {
  const { field, unsavedChange, onInputChange, isSavingEnabled } = props;

  // Create a ref for those input fields that require an imperative handle.
  const inputRef = useRef<ResetInputRef>(null);

  // Create an imperative handle that passes the invocation to any internal input that
  // may require it.
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (inputRef.current) {
        inputRef.current.reset();
      }
    },
  }));

  const inputProps = { isSavingEnabled, onInputChange };

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

    return <ArrayInput {...{ field, unsavedChange, ...inputProps }} />;
  }

  if (isBooleanFieldDefinition(field)) {
    if (!isBooleanFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return <BooleanInput {...{ field, unsavedChange, ...inputProps }} />;
  }

  if (isColorFieldDefinition(field)) {
    if (!isColorFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return <ColorPickerInput {...{ field, unsavedChange, ...inputProps }} />;
  }

  if (isImageFieldDefinition(field)) {
    if (!isImageFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return <ImageInput {...{ field, unsavedChange, ...inputProps }} ref={inputRef} />;
  }

  if (isJsonFieldDefinition(field)) {
    if (!isJsonFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return (
      <CodeEditorInput
        {...{ field, unsavedChange, ...inputProps }}
        type="json"
        defaultValue={field.savedValue || ''}
      />
    );
  }

  if (isMarkdownFieldDefinition(field)) {
    if (!isMarkdownFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return (
      <CodeEditorInput
        {...{ field, unsavedChange, ...inputProps }}
        type="markdown"
        defaultValue={field.savedValue || ''}
      />
    );
  }

  if (isNumberFieldDefinition(field)) {
    if (!isNumberFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return <NumberInput {...{ field, unsavedChange, ...inputProps }} />;
  }

  if (isSelectFieldDefinition(field)) {
    if (!isSelectFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    const {
      options: { values: optionValues, labels: optionLabels },
    } = field;

    return <SelectInput {...{ field, unsavedChange, optionLabels, optionValues, ...inputProps }} />;
  }

  if (isStringFieldDefinition(field)) {
    if (!isStringFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return <TextInput {...{ field, unsavedChange, ...inputProps }} />;
  }

  if (isUndefinedFieldDefinition(field)) {
    if (!isUndefinedFieldUnsavedChange(unsavedChange)) {
      throw getMismatchError(field.type, unsavedChange?.type);
    }

    return (
      <TextInput
        field={field as unknown as FieldDefinition<'string'>}
        unsavedChange={unsavedChange as unknown as UnsavedFieldChange<'string'>}
        {...inputProps}
      />
    );
  }

  throw new Error(`Unknown or incompatible field type: ${field.type}`);
});
