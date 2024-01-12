/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef } from 'react';

import {
  EuiScreenReaderOnly,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiErrorBoundary,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type {
  FieldDefinition,
  ResetInputRef,
  SettingType,
  UnsavedFieldChange,
  OnInputChangeFn,
  OnFieldChangeFn,
} from '@kbn/management-settings-types';
import { isImageFieldDefinition } from '@kbn/management-settings-field-definition';
import { FieldInput } from '@kbn/management-settings-components-field-input';

import { hasUnsavedChange } from '@kbn/management-settings-utilities';
import { FieldDescription } from './description';
import { FieldTitle } from './title';
import { useFieldStyles } from './field_row.styles';
import { FieldInputFooter } from './footer';

export const DATA_TEST_SUBJ_SCREEN_READER_MESSAGE = 'fieldRowScreenReaderMessage';

type Definition<T extends SettingType = SettingType> = Pick<
  FieldDefinition<T>,
  | 'ariaAttributes'
  | 'defaultValue'
  | 'defaultValueDisplay'
  | 'displayName'
  | 'groupId'
  | 'id'
  | 'isCustom'
  | 'isDefaultValue'
  | 'isOverridden'
  | 'name'
  | 'savedValue'
  | 'type'
  | 'unsavedFieldId'
>;

/**
 * Props for a {@link FieldRow} component.
 */
export interface FieldRowProps {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Definition;
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
  /** The {@link OnInputChangeFn} handler. */
  onFieldChange: OnFieldChangeFn;
  /**
   * The onClear handler, if a value is cleared to an empty or default state.
   * @param id The id relating to the field to clear.
   */
  onClear?: (id: string) => void;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange;
}

/**
 * Component for displaying a {@link FieldDefinition} in a form row, using a {@link FieldInput}.
 * @param props The {@link FieldRowProps} for the {@link FieldRow} component.
 */
export const FieldRow = (props: FieldRowProps) => {
  const { isSavingEnabled, onFieldChange, field, unsavedChange } = props;
  const { id, groupId, isOverridden, unsavedFieldId } = field;
  const { cssFieldFormGroup } = useFieldStyles({
    field,
    unsavedChange,
  });

  // Create a ref for those input fields that use a `reset` handle.
  const ref = useRef<ResetInputRef>(null);

  // Route any change to the `onFieldChange` handler, along with the field id.
  const onInputChange: OnInputChangeFn = (update) => {
    onFieldChange(id, update);
  };

  const onReset = () => {
    ref.current?.reset();

    const update = { type: field.type, unsavedValue: field.defaultValue };

    if (hasUnsavedChange(field, update)) {
      onInputChange(update);
    } else {
      onInputChange();
    }
  };

  const onClear = () => {
    if (ref.current) {
      ref.current.reset();
    }

    // Indicate a field is being cleared for a new value by setting its unchanged
    // value to`undefined`. Currently, this only applies to `image` fields.
    if (field.savedValue !== undefined && field.savedValue !== null) {
      onInputChange({ type: field.type, unsavedValue: undefined });
    } else {
      onInputChange();
    }
  };

  const title = <FieldTitle {...{ field, unsavedChange }} />;
  const description = <FieldDescription {...{ field, unsavedChange }} />;
  const error = unsavedChange?.error;
  const isInvalid = unsavedChange?.isInvalid;
  let unsavedScreenReaderMessage = null;

  // Provide a screen-reader only message if there's an unsaved change.
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
        css={cssFieldFormGroup}
        fullWidth
        id={groupId}
        {...{ title, description }}
      >
        <EuiFormRow
          fullWidth
          hasChildLabel={!isImageFieldDefinition(field)}
          label={id}
          helpText={
            <FieldInputFooter {...{ field, isSavingEnabled, onClear, onReset, unsavedChange }} />
          }
          {...{ isInvalid, error }}
        >
          <>
            <FieldInput
              isSavingEnabled={isSavingEnabled && !isOverridden}
              isInvalid={unsavedChange?.isInvalid}
              {...{ field, unsavedChange, ref, onInputChange }}
            />
            {unsavedScreenReaderMessage}
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiErrorBoundary>
  );
};
