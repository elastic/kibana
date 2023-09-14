/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { hasUnsavedChange } from '@kbn/management-settings-utilities';
import { OnChangeFn } from '@kbn/management-settings-components-field-input';
import {
  isImageFieldDefinition,
  isImageFieldUnsavedChange,
} from '@kbn/management-settings-field-definition';

type Field<T extends SettingType> = Pick<
  FieldDefinition<T>,
  'name' | 'defaultValue' | 'type' | 'savedValue' | 'savedValue' | 'ariaAttributes'
>;
/**
 * Props for a {@link ChangeImageLink} component.
 */
export interface ChangeImageLinkProps<T extends SettingType = 'image'> {
  /** The {@link ImageFieldDefinition} corresponding the setting. */
  field: Field<T>;
  /** The {@link OnChangeFn} event handler. */
  onChange: OnChangeFn<T>;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * Component for rendering a link to change the image in a {@link FieldRow} of
 * an {@link ImageFieldDefinition}.
 */
export const ChangeImageLink = <T extends SettingType>({
  field,
  onChange,
  unsavedChange,
}: ChangeImageLinkProps<T>) => {
  if (hasUnsavedChange(field, unsavedChange)) {
    return null;
  }

  const { unsavedValue } = unsavedChange || {};
  const {
    savedValue,
    ariaAttributes: { ariaLabel },
    name,
    defaultValue,
  } = field;

  if (unsavedValue || !savedValue) {
    return null;
  }

  if (isImageFieldDefinition(field) && isImageFieldUnsavedChange(unsavedChange)) {
    return (
      <span>
        <EuiLink
          aria-label={i18n.translate('management.settings.field.changeImageLinkAriaLabel', {
            defaultMessage: 'Change {ariaLabel}',
            values: {
              ariaLabel,
            },
          })}
          onClick={() => onChange({ value: defaultValue })}
          data-test-subj={`management-settings-changeImage-${name}`}
        >
          <FormattedMessage
            id="management.settings.changeImageLinkText"
            defaultMessage="Change image"
          />
        </EuiLink>
      </span>
    );
  }

  return null;
};
