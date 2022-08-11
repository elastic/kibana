/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PaletteOutput,
  PaletteRegistry,
  DataBounds,
  CustomPaletteParams,
} from '../../palettes';
import type { ColorRange, ColorRangesActions } from './color_ranges';

/** @internal **/
export interface PaletteConfigurationState {
  activePalette: PaletteOutput<CustomPaletteParams>;
  colorRanges: ColorRange[];
}

/** @internal **/
export interface UpdateRangeTypePayload {
  rangeType: CustomPaletteParams['rangeType'];
  palettes: PaletteRegistry;
  dataBounds: DataBounds;
}

/** @internal **/
export interface ChangeColorPalettePayload {
  palette: PaletteOutput<CustomPaletteParams>;
  palettes: PaletteRegistry;
  dataBounds: DataBounds;
  disableSwitchingContinuity: boolean;
}

/** @internal **/
export type PaletteConfigurationActions =
  | ColorRangesActions
  | { type: 'updateRangeType'; payload: UpdateRangeTypePayload }
  | { type: 'changeColorPalette'; payload: ChangeColorPalettePayload };
