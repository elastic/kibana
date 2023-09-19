/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiColorPicker, EuiColorPickerProps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

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
  ariaDescribedBy,
  ariaLabel,
  id,
  isDisabled = false,
  isInvalid = false,
  onChange: onChangeProp,
  name,
  value: color,
}: ColorPickerInputProps) => {
  const onChange: EuiColorPickerProps['onChange'] = (newColor, { isValid }) => {
    if (newColor !== '' && !isValid) {
      onChangeProp({ value: newColor, isInvalid: true, error: invalidMessage });
    } else {
      onChangeProp({ value: newColor });
    }
  };

  return (
    <EuiColorPicker
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={isDisabled}
      format="hex"
      isInvalid={isInvalid}
      {...{ name, color, onChange }}
    />
  );
};
