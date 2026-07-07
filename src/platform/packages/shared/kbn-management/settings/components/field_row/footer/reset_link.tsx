/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  FieldDefinition,
  SettingType,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { isFieldDefaultValue } from '@kbn/management-settings-utilities';

/**
 * Props for a {@link InputResetLink} component.
 */
export interface InputResetLinkProps<T extends SettingType = SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<
    FieldDefinition<T>,
    'ariaAttributes' | 'id' | 'savedValue' | 'isOverridden' | 'defaultValue' | 'type'
  >;
  /** A handler for when a field is reset to its default or saved value. */
  onReset: () => void;
  /** A change to the current field, if any. */
  unsavedChange?: UnsavedFieldChange<T>;
}

export const DATA_TEST_SUBJ_RESET_PREFIX = 'management-settings-resetField';
/**
 * Component for rendering a link to reset a {@link FieldDefinition} to its default
 * or saved value.
 */
export const InputResetLink = <T extends SettingType>({
  onReset: onClick,
  field,
  unsavedChange,
}: InputResetLinkProps<T>) => {
  if (isFieldDefaultValue(field, unsavedChange) || field.isOverridden) {
    return null;
  }

  const {
    id,
    ariaAttributes: { ariaLabel },
  } = field;

  return (
    <EuiLink
      aria-label={i18n.translate('management.settings.field.resetToDefaultLinkAriaLabel', {
        defaultMessage: 'Reset {ariaLabel} to default',
        values: {
          ariaLabel,
        },
      })}
      onClick={onClick}
      data-test-subj={`${DATA_TEST_SUBJ_RESET_PREFIX}-${id}`}
    >
      <FormattedMessage
        id="management.settings.resetToDefaultLinkText"
        defaultMessage="Reset to default"
      />
    </EuiLink>
  );
};
