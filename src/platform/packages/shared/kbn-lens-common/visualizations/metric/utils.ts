/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_METRIC_STATE_DEFAULTS, LENS_METRIC_STYLE_TEMPLATE } from './constants';
import type {
  MetricLayoutWithDefault,
  PrimaryMetricPosition,
  MetricStyleTemplateId,
  MetricStyleTemplatePresetId,
} from './types';

/**
 * Infers the active style template by comparing the given layout fields against
 * the known presets. Returns the matching preset id, or 'custom' if no preset matches.
 *
 * `secondaryAlign` is included only when it is set on state; if it is absent, it does not
 * affect which preset matches. `valueFontMode` and `iconAlign` must match shared defaults.
 */
export function inferStyleTemplate(state: {
  primaryPosition?: PrimaryMetricPosition;
  titlesTextAlign?: string;
  primaryAlign?: string;
  secondaryAlign?: string;
  valueFontMode?: string;
  iconAlign?: string;
}): MetricStyleTemplateId {
  const presets = Object.entries(LENS_METRIC_STYLE_TEMPLATE) as Array<
    [MetricStyleTemplatePresetId, Required<MetricLayoutWithDefault>]
  >;

  for (const [id, preset] of presets) {
    const positionMatch =
      (state.primaryPosition ?? LENS_METRIC_STATE_DEFAULTS.primaryPosition) ===
      preset.primaryPosition;
    const titlesMatch =
      (state.titlesTextAlign ?? LENS_METRIC_STATE_DEFAULTS.titlesTextAlign) ===
      preset.titlesTextAlign;
    const primaryAlignMatch =
      (state.primaryAlign ?? LENS_METRIC_STATE_DEFAULTS.primaryAlign) === preset.primaryAlign;
    const secondaryAlignMatch =
      state.secondaryAlign == null || state.secondaryAlign === preset.secondaryAlign;

    const valueFontModeMatch =
      (state.valueFontMode ?? LENS_METRIC_STATE_DEFAULTS.valueFontMode) ===
      LENS_METRIC_STATE_DEFAULTS.valueFontMode;
    const iconAlignMatch =
      (state.iconAlign ?? LENS_METRIC_STATE_DEFAULTS.iconAlign) ===
      LENS_METRIC_STATE_DEFAULTS.iconAlign;

    if (
      positionMatch &&
      titlesMatch &&
      primaryAlignMatch &&
      secondaryAlignMatch &&
      valueFontModeMatch &&
      iconAlignMatch
    ) {
      return id;
    }
  }

  return 'custom';
}
