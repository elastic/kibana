/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, createContext, useContext } from 'react';
import Color from 'color';
import { LegendColorPicker, Position } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover, EuiOutsideClickDetector } from '@elastic/eui';
import type { DatatableRow } from '../../../../expressions/public';
import type { PersistedState } from '../../../../visualizations/public';
import { ColorPicker } from '../../../../charts/public';
import { BucketColumns } from '../../common/types';

const KEY_CODE_ENTER = 13;

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

function getLayerIndex(
  seriesKey: string,
  data: DatatableRow[],
  layers: Array<Partial<BucketColumns>>
): number {
  const row = data.find((d) => Object.keys(d).find((key) => d[key] === seriesKey));
  const bucketId = row && Object.keys(row).find((key) => row[key] === seriesKey);
  return layers.findIndex((layer) => layer.id === bucketId) + 1;
}

function isOnInnerLayer(
  firstBucket: Partial<BucketColumns>,
  data: DatatableRow[],
  seriesKey: string
): DatatableRow | undefined {
  return data.find((d) => firstBucket.id && d[firstBucket.id] === seriesKey);
}

export interface LegendColorPickerWrapperContextType {
  legendPosition: Position;
  setColor: (newColor: string | null, seriesKey: string | number) => void;
  bucketColumns: Array<Partial<BucketColumns>>;
  palette: string;
  data: DatatableRow[];
  uiState: PersistedState;
  distinctColors: boolean;
}

export const LegendColorPickerWrapperContext = createContext<
  LegendColorPickerWrapperContextType | undefined
>(undefined);

export const LegendColorPickerWrapper: LegendColorPicker = ({
  anchor,
  color,
  onClose,
  onChange,
  seriesIdentifiers: [seriesIdentifier],
}) => {
  const seriesName = seriesIdentifier.key;
  const colorPickerWrappingContext = useContext(LegendColorPickerWrapperContext);

  const handleOutsideClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!colorPickerWrappingContext) {
    return null;
  }

  const { legendPosition, setColor, bucketColumns, palette, data, uiState, distinctColors } =
    colorPickerWrappingContext;

  const overwriteColors: Record<string, string> = uiState?.get('vis.colors', {}) ?? {};
  const colorIsOverwritten = Object.keys(overwriteColors).includes(seriesName.toString());
  let keyDownEventOn = false;

  const handleChange = (newColor: string | null) => {
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

  if (!distinctColors) {
    const enablePicker = isOnInnerLayer(bucketColumns[0], data, seriesName) || !bucketColumns[0].id;
    if (!enablePicker) return null;
  }
  const hexColor = new Color(color).hex();
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
          color={palette === 'kibana_palette' ? hexColor : hexColor.toLowerCase()}
          onChange={handleChange}
          label={seriesName}
          maxDepth={bucketColumns.length}
          layerIndex={getLayerIndex(seriesName, data, bucketColumns)}
          useLegacyColors={palette === 'kibana_palette'}
          colorIsOverwritten={colorIsOverwritten}
          onKeyDown={onKeyDown}
        />
      </EuiWrappingPopover>
    </EuiOutsideClickDetector>
  );
};
