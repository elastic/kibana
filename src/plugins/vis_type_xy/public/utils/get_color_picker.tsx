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

import { LegendColorPicker, Position, XYChartSeriesIdentifier, SeriesName } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover } from '@elastic/eui';

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

export const getColorPicker = (
  legendPosition: Position,
  setColor: (newColor: string, seriesKey: string | number, event: BaseSyntheticEvent) => void,
  getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName
): LegendColorPicker => ({ anchor, color, onClose, onChange, seriesIdentifier }) => {
  const seriesName = getSeriesName(seriesIdentifier as XYChartSeriesIdentifier);
  const handlChange = (newColor: string, event: BaseSyntheticEvent) => {
    onClose();
    if (!seriesName) {
      return;
    }
    onChange(newColor);
    setColor(newColor, seriesName, event);
  };

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
      <ColorPicker color={color} onChange={handlChange} label={seriesName} />
    </EuiWrappingPopover>
  );
};
