/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable jsx-a11y/click-events-have-key-events */
// The color picker is not yet accessible.

import React, { useState, useEffect, useCallback } from 'react';
import { EuiIconTip, EuiColorPicker, EuiColorPickerSwatch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PersistedState } from '../../../../visualizations/public';

const COMMAS_NUMS_ONLY_RE = /[^0-9,]/g;

export interface OverwriteColors {
  id: string;
  overwrite: { [key: string]: string };
}

interface ColorProps {
  [key: string]: string | null;
}

export interface ColorPickerProps {
  name: string;
  value: string | null;
  disableTrash?: boolean;
  onChange: (props: ColorProps) => void;
  seriesName?: string;
  uiState?: PersistedState;
  seriesId?: string;
}

export function ColorPicker({
  name,
  value,
  disableTrash = false,
  onChange,
  seriesName,
  uiState,
  seriesId,
}: ColorPickerProps) {
  const [color, setColor] = useState('');

  const handleColorChange = useCallback(
    (text: string, { rgba, hex }) => {
      setColor(text);
      const part: ColorProps = {};
      part[name] = hex ? `rgba(${rgba.join(',')})` : '';
      onChange(part);
      if (uiState && seriesName) {
        const seriesColors: OverwriteColors[] = uiState.get('vis.colors', []);
        const colors: OverwriteColors | undefined = seriesColors.find(({ id }) => id === seriesId);
        if (colors?.overwrite[seriesName]) {
          delete colors.overwrite[seriesName];
        }

        uiState.setSilent('vis.colors', null);
        uiState.set('vis.colors', seriesColors);
        uiState.emit('colorChanged');
      }
    },
    [name, onChange, seriesId, seriesName, uiState]
  );

  useEffect(() => {
    const updateColor = () => {
      const seriesColors: OverwriteColors[] = uiState?.get('vis.colors', []);
      const colors: OverwriteColors | undefined = seriesColors?.find(({ id }) => id === seriesId);
      if (
        seriesName &&
        colors &&
        Object.keys(colors).length !== 0 &&
        colors.overwrite?.[seriesName]
      ) {
        setColor(colors.overwrite[seriesName]);
      } else {
        const initialColorValue = value?.includes('rgba')
          ? value.replace(COMMAS_NUMS_ONLY_RE, '')
          : value;
        setColor(initialColorValue || '');
      }
    };
    updateColor();
    uiState?.on('change', updateColor);

    return () => {
      uiState?.off('change', updateColor);
    };
  }, [value, seriesId, seriesName, uiState]);

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
