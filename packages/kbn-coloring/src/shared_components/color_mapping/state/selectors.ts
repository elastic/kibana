/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getPalette } from '../palette';
import { RootState } from './color_mapping';

export function getPaletteSelector(getPaletteFn: ReturnType<typeof getPalette>) {
  return (state: RootState) => getPaletteFn(state.colorMapping.paletteId);
}
export function getColorModeSelector(state: RootState) {
  return state.colorMapping.colorMode;
}
export function getSpecialAssignmentsSelector(state: RootState) {
  return state.colorMapping.specialAssignments;
}
export function isAutoAssignmentModeSelector(state: RootState) {
  return state.colorMapping.assignmentMode === 'auto';
}
export function getColorPickerVisibilitySelector(state: RootState) {
  return state.ui.colorPicker;
}
