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

import React, { BaseSyntheticEvent, useCallback, useMemo } from 'react';
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
  setColor: (newColor: string | null, seriesKey: string | number, event: BaseSyntheticEvent) => void
): LegendColorPicker =>
  useMemo(
    () => ({ anchor, color, onClose, onChange, seriesIdentifier }) => {
      const selectedSeries = series.filter((s) => s.id === seriesIdentifier.specId);
      if (!selectedSeries[0].isSplitByTerms) {
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
    },
    [legendPosition, series, setColor]
  );
