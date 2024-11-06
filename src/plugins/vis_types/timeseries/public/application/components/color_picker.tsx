/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable jsx-a11y/click-events-have-key-events */
// The color picker is not yet accessible.

import React, { useState } from 'react';
import {
  EuiIconTip,
  EuiColorPicker,
  EuiColorPickerProps,
  EuiColorPickerSwatch,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const COMMAS_NUMS_ONLY_RE = /[^0-9,]/g;

export interface ColorProps {
  [key: string]: string | null;
}

export interface ColorPickerProps {
  name: string;
  value?: string | null;
  disableTrash?: boolean;
  onChange: (props: ColorProps) => void;
}

export function ColorPicker({ name, value, disableTrash = false, onChange }: ColorPickerProps) {
  const initialColorValue = value?.includes('rgba')
    ? value.replace(COMMAS_NUMS_ONLY_RE, '')
    : value;
  const [color, setColor] = useState(initialColorValue || '');

  const { euiTheme } = useEuiTheme();

  const handleColorChange: EuiColorPickerProps['onChange'] = (
    text: string,
    { rgba, hex, isValid }
  ) => {
    setColor(text);
    if (!isValid) {
      return;
    }
    onChange({ [name]: hex ? `rgba(${rgba.join(',')})` : '' });
  };

  const handleClear = () => {
    setColor('');
    onChange({ [name]: null });
  };

  const label = value
    ? i18n.translate('visTypeTimeseries.colorPicker.notAccessibleWithValueAriaLabel', {
        defaultMessage: 'Color picker ({value}), not accessible',
        values: { value },
      })
    : i18n.translate('visTypeTimeseries.colorPicker.notAccessibleAriaLabel', {
        defaultMessage: 'Color picker, not accessible',
      });

  const tsvbColorPickerStyles = css`
    display: flex;
    align-items: center;
    position: relative;
  `;

  const tsvbColorPickerClearStyles = css`
    margin-left: ${euiTheme.size.xs};
  `;

  return (
    <div css={tsvbColorPickerStyles} data-test-subj="tvbColorPicker">
      <EuiColorPicker
        onChange={handleColorChange}
        color={color}
        secondaryInputDisplay="top"
        showAlpha
        button={<EuiColorPickerSwatch color={color} aria-label={label} />}
      />
      {!disableTrash && (
        <div
          css={tsvbColorPickerClearStyles}
          onClick={handleClear}
          data-test-subj="tvbColorPickerClear"
        >
          <EuiIconTip
            size="s"
            type="cross"
            color="danger"
            content={i18n.translate('visTypeTimeseries.colorPicker.clearIconLabel', {
              defaultMessage: 'Clear',
            })}
          />
        </div>
      )}
    </div>
  );
}
