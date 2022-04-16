/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { LegendColorPicker, Position, XYChartSeriesIdentifier, SeriesName } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover, EuiOutsideClickDetector } from '@elastic/eui';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { ColorPicker } from '@kbn/charts-plugin/public';

function getAnchorPosition(legendPosition: Position): PopoverAnchorPosition {
  switch (legendPosition) {
    case Position.Bottom:
      return 'upCenter';
    case Position.Top:
      return 'downCenter';
    case Position.Left:
      return 'rightCenter';
    default:
      return 'leftCenter';
  }
}

const KEY_CODE_ENTER = 13;

export const getColorPicker =
  (
    legendPosition: Position,
    setColor: (newColor: string | null, seriesKey: string | number) => void,
    getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName,
    paletteName: string,
    uiState: PersistedState
  ): LegendColorPicker =>
  ({ anchor, color, onClose, onChange, seriesIdentifiers: [seriesIdentifier] }) => {
    const seriesName = getSeriesName(seriesIdentifier as XYChartSeriesIdentifier);
    const overwriteColors: Record<string, string> = uiState?.get('vis.colors', {});
    const colorIsOverwritten = Object.keys(overwriteColors).includes(seriesName as string);
    let keyDownEventOn = false;

    const handleChange = (newColor: string | null) => {
      if (!seriesName) {
        return;
      }
      if (newColor) {
        onChange(newColor);
      }
      setColor(newColor, seriesName);
      // close the popover if no color is applied or the user has clicked a color
      if (!newColor || !keyDownEventOn) {
        onClose();
      }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.keyCode === KEY_CODE_ENTER) {
        onClose?.();
      }
      keyDownEventOn = true;
    };

    const handleOutsideClick = useCallback(() => {
      onClose?.();
    }, [onClose]);

    return (
      <EuiOutsideClickDetector onOutsideClick={handleOutsideClick}>
        <EuiWrappingPopover
          isOpen
          ownFocus
          display="block"
          button={anchor}
          anchorPosition={getAnchorPosition(legendPosition)}
          closePopover={onClose}
          panelPaddingSize="s"
        >
          <ColorPicker
            color={paletteName === 'kibana_palette' ? color : color.toLowerCase()}
            onChange={handleChange}
            label={seriesName}
            useLegacyColors={paletteName === 'kibana_palette'}
            colorIsOverwritten={colorIsOverwritten}
            onKeyDown={onKeyDown}
          />
        </EuiWrappingPopover>
      </EuiOutsideClickDetector>
    );
  };
