/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PaletteContinuity,
  PaletteRegistry,
  DataBounds,
  CustomPaletteParams,
} from '../../../palettes';

export interface ColorRange {
  color: string;
  start: number;
  end: number;
}

/** @internal **/
export interface ColorRangesState {
  colorRanges: ColorRange[];
  rangeType: CustomPaletteParams['rangeType'];
  continuity: PaletteContinuity;
}

/** @internal **/
interface BasicPayload {
  dataBounds: DataBounds;
  palettes?: PaletteRegistry;
}

/** @internal **/
export interface UpdateColorPayload extends BasicPayload {
  index: number;
  color: string;
}

/** @internal **/
export interface UpdateColorRangeValuePayload extends BasicPayload {
  index: number;
  value: string;
  accessor: ColorRangeAccessor;
}

/** @internal **/
export interface DeleteColorRangePayload extends BasicPayload {
  index: number;
}

/** @internal **/
export interface UpdateContinuityPayload extends BasicPayload {
  isLast: boolean;
  continuity: PaletteContinuity;
}

/** @internal **/
export type ColorRangesActions =
  | { type: 'reversePalette'; payload: BasicPayload }
  | { type: 'sortColorRanges'; payload: BasicPayload }
  | { type: 'distributeEqually'; payload: BasicPayload }
  | { type: 'updateContinuity'; payload: UpdateContinuityPayload }
  | { type: 'deleteColorRange'; payload: DeleteColorRangePayload }
  | {
      type: 'addColorRange';
      payload: BasicPayload;
    }
  | { type: 'updateColor'; payload: UpdateColorPayload }
  | {
      type: 'updateValue';
      payload: UpdateColorRangeValuePayload;
    };

/** @internal **/
export type ColorRangeAccessor = 'start' | 'end';
