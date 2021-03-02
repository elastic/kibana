/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable jsx-a11y/click-events-have-key-events */
// The color picker is not yet accessible.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiIconTip,
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import type { PersistedState } from '../../../../visualizations/public';
import { ColorsService } from '../lib';

const COMMAS_NUMS_ONLY_RE = /[^0-9,]/g;

export interface ColorProps {
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
  isOnLegend?: boolean;
}

export function ColorPicker({
  name,
  value,
  disableTrash = false,
  onChange,
  seriesName,
  uiState,
  seriesId,
  isOnLegend = false,
}: ColorPickerProps) {
  const initialColorValue = value?.includes('rgb') ? value.replace(COMMAS_NUMS_ONLY_RE, '') : value;
  const overwrittenColorsService = useMemo(
    () => (uiState ? new ColorsService(uiState) : undefined),
    [uiState]
  );

  const initialOverwrittenColor =
    seriesId && seriesName && overwrittenColorsService?.getSeriesColor(seriesId, seriesName, '');

  const [color, setColor] = useState(initialColorValue || '');
  const [overwrittenColor, setOverwrittenColor] = useState(initialOverwrittenColor || '');

  const clearOverwriteColor = useCallback(() => {
    if (overwrittenColor && seriesName && seriesId) {
      // remove the overwrittenColor from the uiState
      overwrittenColorsService?.deleteFromUiState(seriesName, seriesId);
    }
  }, [overwrittenColor, overwrittenColorsService, seriesId, seriesName]);

  const handleColorChange = useCallback(
    (text: string, { rgba, hex }) => {
      const part: ColorProps = {};
      part[name] = hex ? `rgba(${rgba.join(',')})` : '';
      onChange(part);
      setColor(text);

      clearOverwriteColor();
    },
    [name, onChange, clearOverwriteColor]
  );

  useEffect(() => {
    const updateColor = () => {
      const newOverwrittenColor =
        uiState &&
        seriesId &&
        seriesName &&
        new ColorsService(uiState).getSeriesColor(seriesId, seriesName, '');
      setOverwrittenColor(newOverwrittenColor ?? '');
    };
    uiState?.on('change', updateColor);

    return () => {
      uiState?.off('change', updateColor);
    };
  }, [initialColorValue, seriesId, seriesName, uiState]);

  const handleClear = useCallback(() => {
    setColor('');
    const part: ColorProps = {};
    part[name] = null;
    onChange(part);
  }, [name, onChange]);

  const label = value
    ? i18n.translate('visTypeTimeseries.colorPicker.notAccessibleWithValueAriaLabel', {
        defaultMessage: 'Color picker ({value}), not accessible',
        values: { value },
      })
    : i18n.translate('visTypeTimeseries.colorPicker.notAccessibleAriaLabel', {
        defaultMessage: 'Color picker, not accessible',
      });

  return (
    <div
      className={classNames('tvbColorPicker', isOnLegend && 'tvbColorPicker__legend')}
      data-test-subj="tvbColorPicker"
    >
      <EuiColorPicker
        onChange={handleColorChange}
        display={isOnLegend ? 'inline' : 'default'}
        color={overwrittenColor || color}
        secondaryInputDisplay="top"
        showAlpha
        button={
          !isOnLegend ? (
            <EuiColorPickerSwatch color={overwrittenColor || color} aria-label={label} />
          ) : undefined
        }
      />
      {isOnLegend && overwrittenColor && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            size="s"
            onClick={() => clearOverwriteColor()}
            data-test-subj="tvbColorPickerClearColor"
          >
            {i18n.translate('visTypeTimeseries.colorPicker.clearColorLabel', {
              defaultMessage: 'Clear Color',
            })}
          </EuiButtonEmpty>
        </>
      )}
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
