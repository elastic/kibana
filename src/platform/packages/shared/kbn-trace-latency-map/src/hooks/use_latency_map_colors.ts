/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import {
  euiPaletteCool,
  euiPaletteWarm,
  hexToRgb,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { DENSITY_LEVELS, FAILURE_LEVELS } from '../chart/encoding';

/** Opacity of the emptiest cell with failures, so that a single failing span still shows. */
const MIN_FAILING_OPACITY = 0.45;

export interface LatencyMapColors {
  /**
   * Colour of a band. A cell without failures takes its step from the cool palette by how many
   * spans it holds. A cell with failures takes it from the warm palette by its failure rate, and
   * shows how many spans it holds in its opacity.
   */
  bandColor: (densityLevel: number, failureLevel: number) => string;
  /** The legend of how many spans, from few to many. */
  densityRamp: string[];
  /** The legend of the failure rate: a cell without failures, then the warm steps. */
  failureRamp: string[];
  selectionStroke: string;
  selectionFill: string;
  outsideSelectionMask: string;
  handleFill: string;
  axisText: string;
  /** Outline of the cell under the pointer. */
  hoverOutline: string;
}

const withOpacity = (hex: string, opacity: number) => {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red},${green},${blue},${opacity})`;
};

/** Colours from the EUI palettes, and from the EUI theme for the selection and the text. */
export function useLatencyMapColors(): LatencyMapColors {
  const { euiTheme } = useEuiTheme();
  return useMemo(() => {
    const cool = euiPaletteCool(DENSITY_LEVELS);
    // The stronger half of the warm palette: its palest steps look like gaps in the map.
    const warm = euiPaletteWarm(2 * (FAILURE_LEVELS - 1)).slice(FAILURE_LEVELS - 1);
    const failingOpacity = (densityLevel: number) =>
      MIN_FAILING_OPACITY + (1 - MIN_FAILING_OPACITY) * ((densityLevel - 1) / (DENSITY_LEVELS - 1));

    return {
      bandColor: (densityLevel, failureLevel) =>
        failureLevel === 0
          ? cool[densityLevel - 1]
          : withOpacity(warm[failureLevel - 1], failingOpacity(densityLevel)),
      densityRamp: cool,
      failureRamp: [cool[DENSITY_LEVELS - 1], ...warm],
      selectionStroke: euiTheme.colors.primary,
      selectionFill: transparentize(euiTheme.colors.primary, 0.12),
      outsideSelectionMask: transparentize(euiTheme.colors.emptyShade, 0.6),
      handleFill: euiTheme.colors.emptyShade,
      axisText: euiTheme.colors.textSubdued,
      hoverOutline: euiTheme.colors.fullShade,
    };
  }, [euiTheme]);
}
