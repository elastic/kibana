/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, Dispatch } from 'react';
import { camelCase } from 'lodash';
import { EuiFlexGroup, EuiTextColor, EuiFlexItem } from '@elastic/eui';
import { CustomPaletteParams, DEFAULT_CONTINUITY, DEFAULT_RANGE_TYPE } from '../../../palettes';

import { ColorRangesExtraActions } from './color_ranges_extra_actions';
import { ColorRangeItem } from './color_ranges_item';
import {
  validateColorRanges,
  getErrorMessages,
  ColorRangeValidation,
} from './color_ranges_validation';

import type { ColorRange } from './types';
import type { PaletteConfigurationActions } from '../types';

export interface ColorRangesProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParams | undefined;
  showExtraActions: boolean;
  dispatch: Dispatch<PaletteConfigurationActions>;
}

export function ColorRanges({
  colorRanges,
  paletteConfiguration,
  showExtraActions,
  dispatch,
}: ColorRangesProps) {
  const [colorRangesValidity, setColorRangesValidity] = useState<
    Record<string, ColorRangeValidation>
  >({});

  const lastColorRange = colorRanges[colorRanges.length - 1];
  const errors = getErrorMessages(colorRangesValidity);
  const continuity = paletteConfiguration?.continuity ?? DEFAULT_CONTINUITY;
  const rangeType = paletteConfiguration?.rangeType ?? DEFAULT_RANGE_TYPE;

  useEffect(() => {
    setColorRangesValidity(validateColorRanges(colorRanges));
  }, [colorRanges]);

  return (
    <EuiFlexGroup
      data-test-subj={`lnsPalettePanel_dynamicColoring_custom_color_ranges`}
      direction="column"
      gutterSize="s"
    >
      {colorRanges.map((colorRange, index) => (
        <EuiFlexItem grow={false} key={`${colorRange.end ?? 0 + colorRange.start ?? 0}${index}`}>
          <ColorRangeItem
            colorRange={colorRange}
            dispatch={dispatch}
            colorRanges={colorRanges}
            continuity={continuity}
            rangeType={rangeType}
            index={index}
            validation={colorRangesValidity[index]}
            accessor="start"
          />
        </EuiFlexItem>
      ))}
      {lastColorRange ? (
        <EuiFlexItem grow={false}>
          <ColorRangeItem
            colorRange={lastColorRange}
            dispatch={dispatch}
            colorRanges={colorRanges}
            continuity={continuity}
            rangeType={rangeType}
            index={colorRanges.length - 1}
            validation={colorRangesValidity.last}
            accessor="end"
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        {errors.map((error) => (
          <EuiTextColor color="danger" key={`${camelCase(error)}`}>
            {error}
          </EuiTextColor>
        ))}
      </EuiFlexItem>
      {showExtraActions ? (
        <EuiFlexItem grow={false}>
          <ColorRangesExtraActions
            dispatch={dispatch}
            shouldDisableAdd={Boolean(
              (paletteConfiguration?.maxSteps &&
                colorRanges.length >= paletteConfiguration?.maxSteps) ||
                errors.length
            )}
            shouldDisableDistribute={Boolean(colorRanges.length === 1)}
            shouldDisableReverse={Boolean(colorRanges.length === 1)}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
