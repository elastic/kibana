/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { BaseSyntheticEvent } from 'react';
import Color from 'color';
import { LegendColorPicker, Position } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover } from '@elastic/eui';
import { DatatableRow } from '../../../expressions/public';
import { BucketColumns } from '../types';
import { ColorPicker } from '../temp';

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
  layerColumns: Array<Partial<BucketColumns>>,
  palette: string,
  data: DatatableRow[]
): LegendColorPicker => ({ anchor, color, onClose, onChange, seriesIdentifier }) => {
  const seriesName = seriesIdentifier.key;
  const handlChange = (newColor: string | null, event: BaseSyntheticEvent) => {
    onClose();
    if (newColor) {
      onChange(newColor);
    }
    setColor(newColor, seriesName, event);
  };

  // For the EuiPalette we want the user to be able to change only the colors of the inner layer
  if (palette !== 'kibana_palette') {
    const enablePicker = isOnInnerLayer(layerColumns[0], data, seriesName);
    if (!enablePicker) return null;
  }
  const hexColor = new Color(color).hex();
  return (
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
        color={hexColor}
        onChange={handlChange}
        label={seriesName}
        maxDepth={layerColumns.length}
        layerIndex={getLayerIndex(seriesName, data, layerColumns)}
      />
    </EuiWrappingPopover>
  );
};
