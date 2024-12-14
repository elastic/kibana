/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCode, EuiCodeBlock, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  isJsonFieldDefinition,
  isMarkdownFieldDefinition,
} from '@kbn/management-settings-field-definition';
import { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';

export const DATA_TEST_SUBJ_DEFAULT_DISPLAY_PREFIX = 'default-display-block';
/**
 * Props for a {@link FieldDefaultValue} component.
 */
export interface FieldDefaultValueProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<
    FieldDefinition<T>,
    'id' | 'type' | 'isDefaultValue' | 'defaultValueDisplay' | 'defaultValue'
  >;
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * Component for displaying the default value of a {@link FieldDefinition}
 * in the {@link FieldRow}.
 */
export const FieldDefaultValue = <T extends SettingType>({
  field,
  unsavedChange,
}: FieldDefaultValueProps<T>) => {
  if (field.isDefaultValue) {
    return null;
  }

  if (
    unsavedChange &&
    (unsavedChange.unsavedValue === field.defaultValue || unsavedChange.unsavedValue === undefined)
  ) {
    return null;
  }

  const { defaultValueDisplay: display, id } = field;

  let value = <EuiCode>{display}</EuiCode>;

  if (isJsonFieldDefinition(field) || isMarkdownFieldDefinition(field)) {
    value = (
      <EuiCodeBlock
        data-test-subj={`${DATA_TEST_SUBJ_DEFAULT_DISPLAY_PREFIX}-${id}`}
        language={field.type}
        paddingSize="s"
        overflowHeight={display.length >= 500 ? 300 : undefined}
      >
        {display}
      </EuiCodeBlock>
    );
  }

  return (
    <EuiText size="xs">
      <FormattedMessage
        id="management.settings.defaultValueText"
        defaultMessage="Default: {value}"
        values={{
          value,
        }}
      />
    </EuiText>
  );
};
