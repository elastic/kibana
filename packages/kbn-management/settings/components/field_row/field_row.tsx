/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiScreenReaderOnly,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiErrorBoundary,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type {
  FieldDefinition,
  SettingType,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { isImageFieldDefinition } from '@kbn/management-settings-field-definition';
import { FieldInput, type OnChangeParams } from '@kbn/management-settings-components-field-input';
import { isUnsavedValue } from '@kbn/management-settings-utilities';

import { FieldDescription } from './description';
import { FieldTitle } from './title';
import { FieldInputFooter } from './input_footer';
import { useFieldStyles } from './field_row.styles';
import { OnChangeFn } from './types';

/**
 * Props for a {@link FieldRow} component.
 */
export interface FieldRowProps<T extends SettingType> {
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
  /** The {@link OnChangeFn} handler. */
  onChange: OnChangeFn<T>;
  /** The onClear handler, if a value is cleared to an empty or default state. */
  onClear?: (key: string) => void;
  /** The {@link FieldDefinition} corresponding the setting. */
  field: FieldDefinition<T>;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * Component for displaying a {@link FieldDefinition} in a form row, using a {@link FieldInput}.
 */
export const FieldRow = <T extends SettingType>({
  isSavingEnabled,
  onChange: onChangeProp,
  field,
  unsavedChange,
}: FieldRowProps<T>) => {
  const { id, name, groupId, isOverridden, type, unsavedFieldId } = field;
  const { cssFieldFormGroup } = useFieldStyles({
    field,
  });

  const onChange = (changes: UnsavedFieldChange<T>) => {
    onChangeProp(name, changes);
  };

  const resetField = () => {
    const { defaultValue: unsavedValue } = field;
    return onChange({ type, unsavedValue });
  };

  const onFieldChange = ({ value: unsavedValue }: OnChangeParams<T>) => {
    if (!isUnsavedValue(field, unsavedValue)) {
      onChange({
        type,
        unsavedValue: undefined,
      });
    } else {
      onChange({
        type,
        unsavedValue,
      });
    }
  };

  const title = <FieldTitle {...{ field, unsavedChange }} />;
  const description = <FieldDescription {...{ field }} />;
  const error = unsavedChange?.error;
  const isInvalid = unsavedChange?.isInvalid;
  let unsavedScreenReaderMessage = null;

  const helpText = (
    <FieldInputFooter
      {...{
        field,
        unsavedChange,
        isSavingEnabled,
        onCancel: resetField,
        onReset: resetField,
        onChange: onFieldChange,
      }}
    />
  );

  if (unsavedChange) {
    unsavedScreenReaderMessage = (
      <EuiScreenReaderOnly>
        <p id={`${unsavedFieldId}`}>
          {unsavedChange.error
            ? unsavedChange.error
            : i18n.translate('management.settings.field.settingIsUnsaved', {
                defaultMessage: 'Setting is currently not saved.',
              })}
        </p>
      </EuiScreenReaderOnly>
    );
  }

  return (
    <EuiErrorBoundary>
      <EuiDescribedFormGroup
        id={groupId}
        fullWidth
        css={cssFieldFormGroup}
        {...{ title, description }}
      >
        <EuiFormRow
          fullWidth
          hasChildLabel={!isImageFieldDefinition(field)}
          label={id}
          {...{ isInvalid, error, helpText }}
        >
          <>
            <FieldInput
              isDisabled={!isSavingEnabled || isOverridden}
              onChange={onFieldChange}
              {...{ field, unsavedChange }}
            />
            {unsavedScreenReaderMessage}
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiErrorBoundary>
  );
};
