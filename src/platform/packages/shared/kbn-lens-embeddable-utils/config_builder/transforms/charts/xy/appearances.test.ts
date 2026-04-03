/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type XYStyling } from '../../../schema/charts/xy';
import { convertStylingToAPIFormat, convertStylingToStateFormat } from './appearances';
import {
  DEFAULT_AREAS_FILL_OPACITY,
  DEFAULT_BARS_MINIMUM_HEIGHT,
  DEFAULT_CURRENT_TIME_MARKER_VISIBLE,
  DEFAULT_DATA_LABELS_VISIBLE,
  DEFAULT_LINES_INTERPOLATION,
  DEFAULT_PARTIAL_BUCKETS_VISIBLE,
  DEFAULT_POINTS_VISIBILITY,
} from './defaults';

describe('XY Appearances Transforms', () => {
  it('should return empty state when given empty API config', () => {
    const apiConfig: XYStyling = {};
    const result = convertStylingToStateFormat(apiConfig);
    expect(result).toEqual({});
  });

  it('should fill styling defaults when converting empty state to API format', () => {
    const result = convertStylingToAPIFormat({});
    expect(result.bars?.minimum_height).toBe(DEFAULT_BARS_MINIMUM_HEIGHT);
    expect(result.areas?.fill_opacity).toBe(DEFAULT_AREAS_FILL_OPACITY);
    expect(result.points?.visibility).toBe(DEFAULT_POINTS_VISIBILITY);
    expect(result.lines?.interpolation).toBe(DEFAULT_LINES_INTERPOLATION);
    expect(result.overlays?.partial_buckets?.visible).toBe(DEFAULT_PARTIAL_BUCKETS_VISIBLE);
    expect(result.overlays?.current_time_marker?.visible).toBe(DEFAULT_CURRENT_TIME_MARKER_VISIBLE);
    expect(result.overlays?.data_labels?.visible).toBe(DEFAULT_DATA_LABELS_VISIBLE);
  });

  it('should preserve complex config through API -> State -> API', () => {
    const original: XYStyling = {
      overlays: {
        partial_buckets: { visible: true },
        current_time_marker: { visible: true },
        data_labels: { visible: true },
      },
      points: { visibility: 'auto' },
      lines: { interpolation: 'smooth' },
      bars: { minimum_height: 3 },
      areas: { fill_opacity: 0.5 },
    };
    const state = convertStylingToStateFormat(original);
    const result = convertStylingToAPIFormat(state);

    expect(result.overlays?.partial_buckets).toEqual(original.overlays?.partial_buckets);
    expect(result.overlays?.current_time_marker).toEqual(original.overlays?.current_time_marker);
    expect(result.overlays?.data_labels).toEqual(original.overlays?.data_labels);
    expect(result.points?.visibility).toBe(original.points?.visibility);
    expect(result.lines?.interpolation).toBe(original.lines?.interpolation);
    expect(result.bars?.minimum_height).toBe(original.bars?.minimum_height);
    expect(result.areas?.fill_opacity).toBe(original.areas?.fill_opacity);
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
    const api = convertStylingToAPIFormat(original);
    const result = convertStylingToStateFormat(api);

    expect(result.valueLabels).toBe(original.valueLabels);
    expect(result.curveType).toBe(original.curveType);
    expect(result.fillOpacity).toBe(original.fillOpacity);
    expect(result.minBarHeight).toBe(original.minBarHeight);
    expect(result.hideEndzones).toBe(original.hideEndzones);
    expect(result.showCurrentTimeMarker).toBe(original.showCurrentTimeMarker);
    expect(result.pointVisibility).toBe(original.pointVisibility);
  });
});
