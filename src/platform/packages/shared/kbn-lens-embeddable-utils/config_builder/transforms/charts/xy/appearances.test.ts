/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type XYDecorations } from '../../../schema/charts/xy';
import { convertAppearanceToAPIFormat, convertAppearanceToStateFormat } from './appearances';

describe('XY Appearances Transforms', () => {
  it('should return empty object when given empty config', () => {
    const apiConfig: XYDecorations = {};
    const result = convertAppearanceToStateFormat(apiConfig);
    expect(result).toEqual({});
  });

  it('should preserve complex config through API -> State -> API', () => {
    const original: XYDecorations = {
      show_value_labels: true,
      line_interpolation: 'smooth',
      fill_opacity: 0.5,
      minimum_bar_height: 3,
      show_end_zones: true,
      show_current_time_marker: true,
      point_visibility: 'auto',
    };
    const state = convertAppearanceToStateFormat(original);
    const result = convertAppearanceToAPIFormat(state);

    expect(result.show_value_labels).toBe(original.show_value_labels);
    expect(result.line_interpolation).toBe(original.line_interpolation);
    expect(result.fill_opacity).toBe(original.fill_opacity);
    expect(result.minimum_bar_height).toBe(original.minimum_bar_height);
    expect(result.show_end_zones).toBe(original.show_end_zones);
    expect(result.show_current_time_marker).toBe(original.show_current_time_marker);
    expect(result.point_visibility).toBe(original.point_visibility);
  });

  it('should preserve complex config through State -> API -> State', () => {
    const original = {
      valueLabels: 'show' as const,
      curveType: 'CURVE_STEP_AFTER' as const,
      fillOpacity: 0.8,
      minBarHeight: 2,
      hideEndzones: false,
      showCurrentTimeMarker: true,
      pointVisibility: 'always' as const,
    };
    const api = convertAppearanceToAPIFormat(original);
    const result = convertAppearanceToStateFormat(api);

    expect(result.valueLabels).toBe(original.valueLabels);
    expect(result.curveType).toBe(original.curveType);
    expect(result.fillOpacity).toBe(original.fillOpacity);
    expect(result.minBarHeight).toBe(original.minBarHeight);
    expect(result.hideEndzones).toBe(original.hideEndzones);
    expect(result.showCurrentTimeMarker).toBe(original.showCurrentTimeMarker);
    expect(result.pointVisibility).toBe(original.pointVisibility);
  });
});
