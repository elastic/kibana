/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPalette } from '../palettes';
import { RootState } from './color_mapping';

export function selectPalette(getPaletteFn: ReturnType<typeof getPalette>) {
  return (state: RootState) => getPaletteFn(state.colorMapping.paletteId);
}
export function selectColorMode(state: RootState) {
  return state.colorMapping.colorMode;
}
export function selectSpecialAssignments(state: RootState) {
  return state.colorMapping.specialAssignments;
}
export function selectColorPickerVisibility(state: RootState) {
  return state.ui.colorPicker;
}
export function selectComputedAssignments(state: RootState) {
  return state.colorMapping.assignments;
}
