/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';

type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'id' | 'isOverridden' | 'name'>;

export const DATA_TEST_SUBJ_OVERRIDDEN_PREFIX = 'field-row-input-overridden-message';

/**
 * Props for a {@link FieldOverriddenMessage} component.
 */
export interface FieldOverriddenMessageProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Field<T>;
}

export const FieldOverriddenMessage = <T extends SettingType>({
  field,
}: FieldOverriddenMessageProps<T>) => {
  if (!field.isOverridden) {
    return null;
  }

  return (
    <EuiText size="xs" data-test-subj={`${DATA_TEST_SUBJ_OVERRIDDEN_PREFIX}-${field.id}`}>
      <FormattedMessage
        id="management.settings.helpText"
        defaultMessage="This setting is overridden by the Kibana server and can not be changed."
      />
    </EuiText>
  );
};
