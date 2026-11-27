/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { isSingleHueRamp } from '@kbn/contrast-roles';
import { useExperimentalColorsId } from './flag';
import type { Targets } from './targets_store';
import type { TileColors, TileInput } from './types';
import { VARIANTS } from './variants';

export interface TileRequest {
  rowIdx: number;
  /** The tile's color, from its palette step or static color. */
  color: string;
  /** The color is a palette step, rather than a static color. */
  fromPalette: boolean;
  hasTrend: boolean;
  /** The color paints the tile's background, rather than its value. */
  isBackground: boolean;
}

export interface ExperimentalColors {
  /** A tile's colors under the active variant, or undefined to keep the chart's own. */
  tile(request: TileRequest): TileColors | undefined;
  /** Wraps the chart in the variant's decorations. Call it after `tile` was called for every tile. */
  decorate(chart: ReactNode): ReactNode;
}

const NO_TARGETS: Targets = {};
const NO_TARGETS_STORE = {
  subscribe: () => () => {},
  get: () => NO_TARGETS,
};

const DEFAULT_COLORS: ExperimentalColors = {
  tile: () => undefined,
  decorate: (chart) => chart,
};

/** The metric tiles' experimental colors, from the feature flag's variant and its targets. */
export const useExperimentalColors = (paletteColors: string[] | undefined): ExperimentalColors => {
  const {
    euiTheme: { colors },
    highContrastMode,
    colorMode,
  } = useEuiTheme();
  const id = useExperimentalColorsId();
  const variant = id === 'default' ? undefined : VARIANTS[id];
  const { subscribe, get } = variant?.targets ?? NO_TARGETS_STORE;
  // Re-renders the chart when the variant's targets change.
  useSyncExternalStore(subscribe, get);
  const isRampPalette = useMemo(
    () => Boolean(paletteColors && isSingleHueRamp(paletteColors)),
    [paletteColors]
  );

  if (!variant || highContrastMode) return DEFAULT_COLORS;

  const mode = colorMode === 'DARK' ? 'dark' : 'light';
  const tiles: Array<TileInput | undefined> = [];
  const { Decorations } = variant;

  return {
    tile: ({ rowIdx, color, fromPalette, hasTrend, isBackground }) => {
      const input: TileInput = {
        color,
        noColor: color === colors.emptyShade,
        mode,
        ramp: fromPalette && isRampPalette,
        hasTrend,
        isBackground,
      };
      tiles[rowIdx] = input;
      return variant.tile(input);
    },
    decorate: (chart) => (Decorations ? <Decorations tiles={tiles}>{chart}</Decorations> : chart),
  };
};
