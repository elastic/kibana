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

export const DATA_TEST_SUBJ_SCREEN_READER_MESSAGE = 'fieldRowScreenReaderMessage';

/**
 * Props for a {@link FieldRow} component.
 */
export interface FieldRowProps<T extends SettingType> {
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
  /** The {@link OnChangeFn} handler. */
  onChange: OnChangeFn<T>;
  /**
   * The onClear handler, if a value is cleared to an empty or default state.
   * @param id The id relating to the field to clear.
   */
  onClear?: (id: string) => void;
  /** The {@link FieldDefinition} corresponding the setting. */
  field: FieldDefinition<T>;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * Component for displaying a {@link FieldDefinition} in a form row, using a {@link FieldInput}.
 * @param props The {@link FieldRowProps} for the {@link FieldRow} component.
 */
export const FieldRow = <T extends SettingType>(props: FieldRowProps<T>) => {
  const { isSavingEnabled, onChange: onChangeProp, field, unsavedChange } = props;
  const { id, name, groupId, isOverridden, type, unsavedFieldId } = field;
  const { cssFieldFormGroup } = useFieldStyles({
    field,
    unsavedChange,
  });

  const onChange = (changes: UnsavedFieldChange<T>) => {
    onChangeProp(name, changes);
  };

  const resetField = () => {
    const { defaultValue: unsavedValue } = field;
    return onChange({ type, unsavedValue });
  };

  const onFieldChange = ({ isInvalid, error, value: unsavedValue }: OnChangeParams<T>) => {
    if (error) {
      isInvalid = true;
    }

    const change = {
      type,
      isInvalid,
      error,
    };

    if (!isUnsavedValue(field, unsavedValue)) {
      onChange(change);
    } else {
      onChange({
        ...change,
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
        <p
          id={`${unsavedFieldId}`}
          data-test-subj={`${DATA_TEST_SUBJ_SCREEN_READER_MESSAGE}-${id}`}
        >
          {error
            ? error
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
              isInvalid={unsavedChange?.isInvalid}
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
