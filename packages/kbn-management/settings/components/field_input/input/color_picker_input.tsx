/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiColorPicker, EuiColorPickerProps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';
import { UnsavedFieldChange } from '@kbn/management-settings-types';

import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { InputProps } from '../types';

/**
 * Props for a {@link ColorPickerInput} component.
 */
export type ColorPickerInputProps = InputProps<'color'>;

const invalidMessage = i18n.translate('management.settings.fieldInput.color.invalidMessage', {
  defaultMessage: 'Provide a valid color value',
});

/**
 * Component for manipulating a `color` field.
 */
export const ColorPickerInput = ({
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: ColorPickerInputProps) => {
  const onUpdate = useUpdate({ onInputChange, field });

  const onChange: EuiColorPickerProps['onChange'] = (newColor, { isValid }) => {
    const update: UnsavedFieldChange<'color'> = { type: field.type, unsavedValue: newColor };

    if (isValid) {
      onUpdate(update);
    } else {
      onUpdate({ ...update, isInvalid: true, error: invalidMessage });
    }
  };

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;
  const [color] = getFieldInputValue(field, unsavedChange);

  return (
    <EuiColorPicker
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={!isSavingEnabled}
      format="hex"
      isInvalid={unsavedChange?.isInvalid}
      {...{ name, color, onChange }}
    />
  );
};
