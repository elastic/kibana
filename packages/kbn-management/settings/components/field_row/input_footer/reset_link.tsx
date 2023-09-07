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

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';

/**
 * Props for a {@link FieldResetLink} component.
 */
export interface FieldResetLinkProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<FieldDefinition<T>, 'id' | 'isDefaultValue' | 'ariaAttributes'>;
  /** A handler for when a field is reset to its default or saved value. */
  onReset: () => void;
}

export const DATA_TEST_SUBJ_RESET_PREFIX = 'management-settings-resetField';
/**
 * Component for rendering a link to reset a {@link FieldDefinition} to its default
 * or saved value.
 */
export const FieldResetLink = <T extends SettingType>({
  onReset,
  field,
}: FieldResetLinkProps<T>) => {
  if (field.isDefaultValue) {
    return null;
  }

  const {
    id,
    ariaAttributes: { ariaLabel },
  } = field;

  return (
    <span>
      <EuiLink
        aria-label={i18n.translate('management.settings.field.resetToDefaultLinkAriaLabel', {
          defaultMessage: 'Reset {ariaLabel} to default',
          values: {
            ariaLabel,
          },
        })}
        onClick={onReset}
        data-test-subj={`${DATA_TEST_SUBJ_RESET_PREFIX}-${id}`}
      >
        <FormattedMessage
          id="management.settings.resetToDefaultLinkText"
          defaultMessage="Reset to default"
        />
      </EuiLink>
      &nbsp;&nbsp;&nbsp;
    </span>
  );
};
