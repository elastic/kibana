/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { LegendColorPicker, Position } from '@elastic/charts';
import Color from 'color';
import { PopoverAnchorPosition, EuiWrappingPopover } from '@elastic/eui';
import type { PersistedState } from '../../../../../../../visualizations/public';
import { PanelData } from '../../../../../../common/types';
import { ColorPicker, ColorProps } from '../../../../components/color_picker';
import { labelDateFormatter } from '../../../../components/lib/label_date_formatter';
import { ColorsService } from '../../../../lib';

function getAnchorPosition(legendPosition: Position): PopoverAnchorPosition {
  switch (legendPosition) {
    case Position.Bottom:
      return 'upCenter';
    case Position.Left:
      return 'rightCenter';
    default:
      return 'leftCenter';
  }
}

export const getColorPicker = (
  legendPosition: Position,
  series: PanelData[],
  uiState: PersistedState
): LegendColorPicker => ({
  anchor,
  color,
  onClose,
  onChange,
  seriesIdentifiers: [seriesIdentifier],
}) => {
  const selectedSeries = series.filter((s) => s.id === seriesIdentifier.specId);
  if (!selectedSeries.length) {
    return null;
  }
  let seriesName = selectedSeries[0].label.toString();
  if (selectedSeries[0].labelFormatted) {
    seriesName = labelDateFormatter(selectedSeries[0].labelFormatted);
  }

  const handleChange = (newColor: ColorProps | null) => {
    if (newColor?.color) {
      const hexColor = new Color(newColor.color).hex();
      onChange(hexColor);
      // add the series overwritten color to the uiState
      const colorsService = new ColorsService(uiState);
      colorsService.addToUiState(seriesName, seriesIdentifier.specId, hexColor);
    }
  };

  return (
    <I18nProvider>
      <EuiWrappingPopover
        closePopover={onClose}
        isOpen
        ownFocus
        button={anchor}
        anchorPosition={getAnchorPosition(legendPosition)}
        panelPaddingSize="s"
      >
        <ColorPicker
          disableTrash={true}
          onChange={handleChange}
          name="color"
          value={color}
          isOnLegend={true}
          uiState={uiState}
          seriesName={seriesName}
          seriesId={seriesIdentifier.specId}
        />
      </EuiWrappingPopover>
    </I18nProvider>
  );
};
