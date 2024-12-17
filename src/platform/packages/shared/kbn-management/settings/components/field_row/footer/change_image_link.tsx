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

import { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { hasUnsavedChange } from '@kbn/management-settings-utilities';

export const DATA_TEST_SUBJ_CHANGE_LINK_PREFIX = 'management-settings-change-image';

type Field<T extends SettingType> = Pick<
  FieldDefinition<T>,
  'id' | 'type' | 'savedValue' | 'ariaAttributes' | 'isOverridden'
>;

/**
 * Props for a {@link ChangeImageLink} component.
 */
export interface ChangeImageLinkProps<T extends SettingType = 'image'> {
  /** The {@link ImageFieldDefinition} corresponding the setting. */
  field: Field<T>;
  unsavedChange?: UnsavedFieldChange<T>;
  onClear: () => void;
}

/**
 * Component for rendering a link to change the image in a {@link FieldRow} of
 * an {@link ImageFieldDefinition}.
 */
export const ChangeImageLink = <T extends SettingType>({
  field,
  onClear,
  unsavedChange,
}: ChangeImageLinkProps<T>) => {
  if (field.type !== 'image') {
    return null;
  }

  const {
    ariaAttributes: { ariaLabel },
    isOverridden,
    savedValue,
  } = field;

  if (
    // If the field is overridden...
    isOverridden ||
    // ... or if there's a saved value but no unsaved change...
    (!savedValue && !hasUnsavedChange(field, unsavedChange)) ||
    // ... or if there's a saved value and an undefined unsaved value...
    (savedValue && !!unsavedChange && unsavedChange.unsavedValue === undefined)
  ) {
    // ...don't render the link.
    return null;
  }

  // Use the type-guards on the definition and unsaved change.
  return (
    <span>
      <EuiLink
        aria-label={i18n.translate('management.settings.field.changeImageLinkAriaLabel', {
          defaultMessage: 'Change {ariaLabel}',
          values: {
            ariaLabel,
          },
        })}
        onClick={() => onClear()}
        data-test-subj={`${DATA_TEST_SUBJ_CHANGE_LINK_PREFIX}-${field.id}`}
      >
        <FormattedMessage
          id="management.settings.changeImageLinkText"
          defaultMessage="Change image"
        />
      </EuiLink>
    </span>
  );
};
