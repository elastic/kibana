/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useCallback, useContext } from 'react';
import { LegendColorPicker, Position, XYChartSeriesIdentifier } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover, EuiOutsideClickDetector } from '@elastic/eui';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { ColorPicker } from '@kbn/charts-plugin/public';
import {
  DatatablesWithFormatInfo,
  getMetaFromSeriesId,
  getSeriesName,
  hasMultipleLayersWithSplits,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from '../helpers';
import type { CommonXYDataLayerConfig } from '../../common/types';

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

export interface LegendColorPickerWrapperContextType {
  legendPosition: Position;
  setColor: (newColor: string | null, seriesKey: string | number) => void;
  uiState?: PersistedState;
  dataLayers: CommonXYDataLayerConfig[];
  formattedDatatables: DatatablesWithFormatInfo;
  titles: LayersAccessorsTitles;
  fieldFormats: LayersFieldFormats;
  singleTable?: boolean;
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
  const colorPickerWrappingContext = useContext(LegendColorPickerWrapperContext);
  const handleOutsideClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!colorPickerWrappingContext) {
    return null;
  }

  const {
    legendPosition,
    setColor,
    uiState,
    dataLayers,
    titles,
    formattedDatatables,
    fieldFormats,
    singleTable,
  } = colorPickerWrappingContext;
  const { layerId } = getMetaFromSeriesId(seriesIdentifier.specId);

  const layer = dataLayers.find((dataLayer) => dataLayer.layerId === layerId);
  const allYAccessors = dataLayers.flatMap((dataLayer) => dataLayer.accessors);
  const seriesName = layer
    ? getSeriesName(
        seriesIdentifier as XYChartSeriesIdentifier,
        {
          splitAccessors: layer.splitAccessors ?? [],
          accessorsCount: singleTable ? allYAccessors.length : layer.accessors.length,
          columns: formattedDatatables[layer.layerId].table.columns,
          splitAccessorsFormats: fieldFormats[layer.layerId].splitSeriesAccessors,
          alreadyFormattedColumns: formattedDatatables[layer.layerId].formattedColumns,
          columnToLabelMap: layer.columnToLabel ? JSON.parse(layer.columnToLabel) : {},
          multipleLayersWithSplits: hasMultipleLayersWithSplits(dataLayers),
        },
        titles[layer.layerId]
      )?.toString() || ''
    : '';

  const overwriteColors: Record<string, string> = uiState?.get('vis.colors', {}) ?? {};
  const colorIsOverwritten = seriesName.toString() in overwriteColors;
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

  return (
    <EuiOutsideClickDetector onOutsideClick={handleOutsideClick}>
      <EuiWrappingPopover
        isOpen={true}
        ownFocus
        display="block"
        button={anchor}
        anchorPosition={getAnchorPosition(legendPosition)}
        closePopover={onClose}
        panelPaddingSize="s"
      >
        <ColorPicker
          color={layer?.palette.name === 'kibana_palette' ? color : color.toLowerCase()}
          onChange={handleChange}
          label={seriesName}
          useLegacyColors={layer?.palette.name === 'kibana_palette'}
          colorIsOverwritten={colorIsOverwritten}
          onKeyDown={onKeyDown}
        />
      </EuiWrappingPopover>
    </EuiOutsideClickDetector>
  );
};
