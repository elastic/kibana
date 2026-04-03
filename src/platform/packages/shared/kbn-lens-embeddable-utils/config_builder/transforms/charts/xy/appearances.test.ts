/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type XYStyling } from '../../../schema/charts/xy';
import {
  convertStylingToAPIFormat,
  convertStylingToStateFormat,
  type LayerPresence,
} from './appearances';
import {
  DEFAULT_AREAS_FILL_OPACITY,
  DEFAULT_BARS_MINIMUM_HEIGHT,
  DEFAULT_CURRENT_TIME_MARKER_VISIBLE,
  DEFAULT_DATA_LABELS_VISIBLE,
  DEFAULT_LINES_INTERPOLATION,
  DEFAULT_PARTIAL_BUCKETS_VISIBLE,
  DEFAULT_POINTS_VISIBILITY,
} from './defaults';

const allLayersPresent: LayerPresence = { hasBars: true, hasLines: true, hasAreas: true };

describe('XY Appearances Transforms', () => {
  it('should return empty state when given empty API config', () => {
    const apiConfig: XYStyling = {};
    const result = convertStylingToStateFormat(apiConfig);
    expect(result).toEqual({});
  });

  it('should fill styling defaults when converting empty state to API format', () => {
    const result = convertStylingToAPIFormat({}, allLayersPresent);
    expect(result.bars?.minimum_height).toBe(DEFAULT_BARS_MINIMUM_HEIGHT);
    expect(result.areas?.fill_opacity).toBe(DEFAULT_AREAS_FILL_OPACITY);
    expect(result.points?.visibility).toBe(DEFAULT_POINTS_VISIBILITY);
    expect(result.lines?.interpolation).toBe(DEFAULT_LINES_INTERPOLATION);
    expect(result.overlays?.partial_buckets?.visible).toBe(DEFAULT_PARTIAL_BUCKETS_VISIBLE);
    expect(result.overlays?.current_time_marker?.visible).toBe(DEFAULT_CURRENT_TIME_MARKER_VISIBLE);
    expect(result.bars?.data_labels?.visible).toBe(DEFAULT_DATA_LABELS_VISIBLE);
  });

  it('should omit bars styling when no bar layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: false, hasLines: true, hasAreas: true }
    );
    expect(result.bars).toBeUndefined();
    expect(result.lines).toBeDefined();
    expect(result.areas).toBeDefined();
    expect(result.points).toBeDefined();
  });

  it('should omit lines styling when no line layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: true, hasLines: false, hasAreas: true }
    );
    expect(result.lines).toBeUndefined();
    expect(result.bars).toBeDefined();
    expect(result.areas).toBeDefined();
    expect(result.points).toBeDefined();
  });

  it('should omit areas styling when no area layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: true, hasLines: true, hasAreas: false }
    );
    expect(result.areas).toBeUndefined();
    expect(result.bars).toBeDefined();
    expect(result.lines).toBeDefined();
    expect(result.points).toBeDefined();
  });

  it('should omit points styling when no line or area layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: true, hasLines: false, hasAreas: false }
    );
    expect(result.points).toBeUndefined();
    expect(result.bars).toBeDefined();
  });

  it('should include points styling when only area layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: false, hasLines: false, hasAreas: true }
    );
    expect(result.points).toBeDefined();
  });

  it('should always include overlays regardless of layer types', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: true, hasLines: false, hasAreas: false }
    );
    expect(result.overlays).toBeDefined();
    expect(result.overlays?.partial_buckets).toBeDefined();
    expect(result.overlays?.current_time_marker).toBeDefined();
  });

  it('should include data_labels under bars when bar layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: true, hasLines: false, hasAreas: false }
    );
    expect(result.bars?.data_labels?.visible).toBe(DEFAULT_DATA_LABELS_VISIBLE);
  });

  it('should omit data_labels when no bar layers exist', () => {
    const result = convertStylingToAPIFormat(
      {},
      { hasBars: false, hasLines: true, hasAreas: false }
    );
    expect(result.bars).toBeUndefined();
  });

  it('should preserve complex config through API -> State -> API', () => {
    const original: XYStyling = {
      overlays: {
        partial_buckets: { visible: true },
        current_time_marker: { visible: true },
      },
      points: { visibility: 'auto' },
      lines: { interpolation: 'smooth' },
      bars: { minimum_height: 3, data_labels: { visible: true } },
      areas: { fill_opacity: 0.5 },
    };
    const state = convertStylingToStateFormat(original);
    const result = convertStylingToAPIFormat(state, allLayersPresent);

    expect(result.overlays?.partial_buckets).toEqual(original.overlays?.partial_buckets);
    expect(result.overlays?.current_time_marker).toEqual(original.overlays?.current_time_marker);
    expect(result.bars?.data_labels).toEqual(original.bars?.data_labels);
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
    const api = convertStylingToAPIFormat(original, allLayersPresent);
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
