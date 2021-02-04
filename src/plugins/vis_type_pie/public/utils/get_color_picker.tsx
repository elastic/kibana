/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { BaseSyntheticEvent, useCallback } from 'react';
import Color from 'color';
import { LegendColorPicker, Position } from '@elastic/charts';
import { PopoverAnchorPosition, EuiPopover, EuiOutsideClickDetector } from '@elastic/eui';
import { DatatableRow } from '../../../expressions/public';
import { ColorPicker } from '../../../charts/public';
import { BucketColumns } from '../types';

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

export const getColorPicker = (
  legendPosition: Position,
  setColor: (
    newColor: string | null,
    seriesKey: string | number,
    event: BaseSyntheticEvent
  ) => void,
  bucketColumns: Array<Partial<BucketColumns>>,
  palette: string,
  data: DatatableRow[]
): LegendColorPicker => ({ anchor, color, onClose, onChange, seriesIdentifier }) => {
  const seriesName = seriesIdentifier.key;
  const handlChange = (newColor: string | null, event: BaseSyntheticEvent) => {
    if (newColor) {
      onChange(newColor);
    }
    setColor(newColor, seriesName, event);
    onClose();
  };

  const handleOutsideClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // For the EuiPalette we want the user to be able to change only the colors of the inner layer
  if (palette !== 'kibana_palette') {
    const enablePicker = isOnInnerLayer(bucketColumns[0], data, seriesName);
    if (!enablePicker) return null;
  }
  const hexColor = new Color(color).hex();
  return (
    <EuiOutsideClickDetector onOutsideClick={handleOutsideClick}>
      <EuiPopover
        isOpen
        ownFocus
        display="block"
        button={anchor}
        anchorPosition={getAnchorPosition(legendPosition)}
        closePopover={onClose}
        panelPaddingSize="s"
      >
        <ColorPicker
          color={hexColor}
          onChange={handlChange}
          label={seriesName}
          maxDepth={bucketColumns.length}
          layerIndex={getLayerIndex(seriesName, data, bucketColumns)}
        />
      </EuiPopover>
    </EuiOutsideClickDetector>
  );
};
