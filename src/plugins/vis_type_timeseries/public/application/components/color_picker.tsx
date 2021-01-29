/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable jsx-a11y/click-events-have-key-events */
// The color picker is not yet accessible.

import React, { useState } from 'react';
import {
  EuiIconTip,
  EuiColorPicker,
  EuiColorPickerProps,
  EuiColorPickerSwatch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const COMMAS_NUMS_ONLY_RE = /[^0-9,]/g;

interface ColorProps {
  [key: string]: string | null;
}

export interface ColorPickerProps {
  name: string;
  value: string | null;
  disableTrash?: boolean;
  onChange: (props: ColorProps) => void;
}

export function ColorPicker({ name, value, disableTrash = false, onChange }: ColorPickerProps) {
  const initialColorValue = value?.includes('rgba')
    ? value.replace(COMMAS_NUMS_ONLY_RE, '')
    : value;
  const [color, setColor] = useState(initialColorValue || '');

  const handleColorChange: EuiColorPickerProps['onChange'] = (text: string, { rgba, hex }) => {
    setColor(text);
    const part: ColorProps = {};
    part[name] = hex ? `rgba(${rgba.join(',')})` : '';
    onChange(part);
  };

  const handleClear = () => {
    setColor('');
    const part: ColorProps = {};
    part[name] = null;
    onChange(part);
  };

  const label = value
    ? i18n.translate('visTypeTimeseries.colorPicker.notAccessibleWithValueAriaLabel', {
        defaultMessage: 'Color picker ({value}), not accessible',
        values: { value },
      })
    : i18n.translate('visTypeTimeseries.colorPicker.notAccessibleAriaLabel', {
        defaultMessage: 'Color picker, not accessible',
      });

  return (
    <div className="tvbColorPicker" data-test-subj="tvbColorPicker">
      <EuiColorPicker
        onChange={handleColorChange}
        color={color}
        secondaryInputDisplay="top"
        showAlpha
        button={<EuiColorPickerSwatch color={color} aria-label={label} />}
      />
      {!disableTrash && (
        <div className="tvbColorPicker__clear" onClick={handleClear}>
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
