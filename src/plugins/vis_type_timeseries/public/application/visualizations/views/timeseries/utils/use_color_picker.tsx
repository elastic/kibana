/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { BaseSyntheticEvent, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { LegendColorPicker, Position } from '@elastic/charts';
import { PopoverAnchorPosition, EuiWrappingPopover, EuiOutsideClickDetector } from '@elastic/eui';
import { PanelData } from '../../../../../../common/types';
import { ColorPicker } from '../../../../../../../charts/public';
import { labelDateFormatter } from '../../../../components/lib/label_date_formatter';

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

export const useColorPicker = (
  legendPosition: Position,
  series: PanelData[],
  setColor: (
    newColor: string | null,
    seriesKey: string | number,
    id: string,
    event: BaseSyntheticEvent
  ) => void
): LegendColorPicker => ({ anchor, color, onClose, onChange, seriesIdentifier }) => {
  const selectedSeries = series.filter((s) => s.id === seriesIdentifier.specId);
  if (!selectedSeries.length) {
    return null;
  }
  let seriesName = selectedSeries[0].label.toString();
  if (selectedSeries[0].labelFormatted) {
    seriesName = labelDateFormatter(selectedSeries[0].labelFormatted);
  }

  const handleChange = (newColor: string | null, event: BaseSyntheticEvent) => {
    if (newColor) {
      onChange(newColor);
    }
    setColor(newColor, seriesName, seriesIdentifier.specId, event);
    // must be called after onChange
    onClose();
  };

  // rule doesn't know this is inside a functional component
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleOutsideClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <I18nProvider>
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
          <ColorPicker color={color} onChange={handleChange} label={seriesName} />
        </EuiWrappingPopover>
      </EuiOutsideClickDetector>
    </I18nProvider>
  );
};
