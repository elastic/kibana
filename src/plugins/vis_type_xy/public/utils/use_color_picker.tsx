/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { BaseSyntheticEvent, useCallback, useMemo } from 'react';

import { LegendColorPicker, Position, XYChartSeriesIdentifier, SeriesName } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover, EuiOutsideClickDetector } from '@elastic/eui';

import { ColorPicker } from '../../../charts/public';

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

export const useColorPicker = (
  legendPosition: Position,
  setColor: (
    newColor: string | null,
    seriesKey: string | number,
    event: BaseSyntheticEvent
  ) => void,
  getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName
): LegendColorPicker =>
  useMemo(
    () => ({ anchor, color, onClose, onChange, seriesIdentifiers: [seriesIdentifier] }) => {
      const seriesName = getSeriesName(seriesIdentifier as XYChartSeriesIdentifier);
      const handlChange = (newColor: string | null, event: BaseSyntheticEvent) => {
        if (!seriesName) {
          return;
        }
        if (newColor) {
          onChange(newColor);
        }
        setColor(newColor, seriesName, event);
        // must be called after onChange
        onClose();
      };

      // rule doesn't know this is inside a functional component
      // eslint-disable-next-line react-hooks/rules-of-hooks
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
            <ColorPicker color={color} onChange={handlChange} label={seriesName} />
          </EuiWrappingPopover>
        </EuiOutsideClickDetector>
      );
    },
    [getSeriesName, legendPosition, setColor]
  );
