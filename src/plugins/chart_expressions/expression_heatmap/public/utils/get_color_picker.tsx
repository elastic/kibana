/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { LegendColorPicker, Position } from '@elastic/charts';
import { PopoverAnchorPosition, EuiPopover, EuiOutsideClickDetector } from '@elastic/eui';
import type { PersistedState } from '../../../../visualizations/public';
import { ColorPicker } from '../../../../charts/public';

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

export const getColorPicker =
  (
    legendPosition: Position,
    setColor: (newColor: string | null, seriesKey: string | number) => void,
    uiState: PersistedState
  ): LegendColorPicker =>
  ({ anchor, color, onClose, onChange, seriesIdentifiers: [seriesIdentifier] }) => {
    const seriesName = seriesIdentifier.key;
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

    const handleOutsideClick = useCallback(() => {
      onClose?.();
    }, [onClose]);

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
            color={color}
            onChange={handleChange}
            label={seriesName}
            useLegacyColors={false}
            colorIsOverwritten={colorIsOverwritten}
            onKeyDown={onKeyDown}
          />
        </EuiPopover>
      </EuiOutsideClickDetector>
    );
  };
