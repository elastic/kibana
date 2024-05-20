/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FieldDefinition, UnsavedFieldChange, SettingType } from '@kbn/management-settings-types';
import { hasUnsavedChange } from '@kbn/management-settings-utilities';

/**
 * Props for a {@link FieldTitle} component.
 */
export interface TitleProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<FieldDefinition<T>, 'id' | 'type' | 'isOverridden' | 'savedValue'>;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 *
 */
export const FieldTitleUnsavedIcon = <T extends SettingType>({
  field,
  unsavedChange,
}: TitleProps<T>) => {
  if (!unsavedChange || !hasUnsavedChange(field, unsavedChange)) {
    return null;
  }

  const { isInvalid } = unsavedChange;

  const invalidLabel = i18n.translate('management.settings.field.invalidIconLabel', {
    defaultMessage: 'Invalid',
  });

  const unsavedLabel = i18n.translate('management.settings.field.unsavedIconLabel', {
    defaultMessage: 'Unsaved',
  });

  const unsavedIconLabel = unsavedChange.isInvalid ? invalidLabel : unsavedLabel;

  return (
    <EuiIconTip
      type={isInvalid ? 'warning' : 'dot'}
      color={isInvalid ? 'danger' : 'warning'}
      aria-label={unsavedIconLabel}
      content={unsavedIconLabel}
    />
  );
};
