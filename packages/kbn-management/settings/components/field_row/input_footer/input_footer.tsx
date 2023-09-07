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

import { OnChangeFn } from '@kbn/management-settings-components-field-input';

import { FieldResetLink } from './reset_link';
import { ChangeImageLink } from './change_image_link';
import { FieldOverriddenMessage } from './overridden_message';

export const DATA_TEST_SUBJ_FOOTER_PREFIX = 'field-row-input-footer';

type Field<T extends SettingType> = Pick<
  FieldDefinition<T>,
  'id' | 'name' | 'isOverridden' | 'type' | 'ariaAttributes' | 'isDefaultValue'
>;

/**
 * Props for a {@link FieldInputFooter} component.
 */
export interface FieldInputFooterProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Field<T>;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
  /** The {@link OnChangeFn} handler. */
  onChange: OnChangeFn<T>;
  /** A handler for when a field is reset to its default or saved value. */
  onReset: () => void;
  /** True if saving this setting is enabled, false otherwise. */
  isSavingEnabled: boolean;
}

export const FieldInputFooter = <T extends SettingType>({
  isSavingEnabled,
  field,
  onReset,
  ...props
}: FieldInputFooterProps<T>) => {
  if (field.isOverridden) {
    return <FieldOverriddenMessage {...{ field }} />;
  }

  if (isSavingEnabled) {
    return (
      <span data-test-subj={`${DATA_TEST_SUBJ_FOOTER_PREFIX}-${field.id}`}>
        <FieldResetLink {...{ /* isLoading,*/ field, onReset }} />
        <ChangeImageLink {...{ field, ...props }} />
      </span>
    );
  }

  return null;
};
