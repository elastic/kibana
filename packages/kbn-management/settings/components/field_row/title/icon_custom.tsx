/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldDefinition, SettingType } from '@kbn/management-settings-types';

/**
 * Props for a {@link FieldTitle} component.
 */
export interface TitleProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<FieldDefinition<T>, 'isCustom'>;
}

/**
 *
 */
export const FieldTitleCustomIcon = <T extends SettingType>({ field }: TitleProps<T>) => {
  if (!field.isCustom) {
    return null;
  }

  return (
    <EuiIconTip
      type="asterisk"
      color="primary"
      aria-label={i18n.translate('management.settings.field.customSettingAriaLabel', {
        defaultMessage: 'Custom setting',
      })}
      content={
        <FormattedMessage
          id="management.settings.customSettingTooltip"
          defaultMessage="Custom setting"
        />
      }
    />
  );
};
