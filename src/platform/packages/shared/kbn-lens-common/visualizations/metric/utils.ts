/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LENS_LEGACY_METRIC_STATE_DEFAULTS,
  LENS_METRIC_STATE_DEFAULTS,
  LENS_METRIC_STYLE_TEMPLATE,
} from './constants';
import type {
  IconPosition,
  MetricLayoutWithDefault,
  PrimaryMetricPosition,
  MetricStyleTemplateId,
  MetricStyleTemplatePresetId,
} from './types';

/**
 * Returns the effective iconAlign value for a given state, mirroring the logic used
 * during expression rendering:
 * - If an icon is present but iconAlign is not stored (legacy state), fall back to the
 *   legacy default ('left') — the same default applied by the old metric vis renderer.
 * - Otherwise, use the stored value or the current shared default ('right').
 */
export function getEffectiveIconAlign(state: {
  icon?: string;
  iconAlign?: IconPosition;
}): IconPosition {
  if (state.icon && state.icon !== 'empty') {
    return state.iconAlign ?? LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign;
  }
  return state.iconAlign ?? LENS_METRIC_STATE_DEFAULTS.iconAlign;
}

/**
 * Infers the active style template by comparing the given layout fields against
 * the known presets. Returns the matching preset id, or 'custom' if no preset matches.
 *
 * All absent fields are treated as their shared default values for comparison purposes.
 * `valueFontMode` and `iconAlign` are not preset-specific — they must equal the shared
 * defaults for any preset to match (i.e. non-default values always produce 'custom').
 */
export function inferStyleTemplate(state: {
  primaryPosition?: PrimaryMetricPosition;
  titlesTextAlign?: string;
  primaryAlign?: string;
  secondaryAlign?: string;
  valueFontMode?: string;
  iconAlign?: IconPosition;
  icon?: string;
}): MetricStyleTemplateId {
  const presets = Object.entries(LENS_METRIC_STYLE_TEMPLATE) as Array<
    [MetricStyleTemplatePresetId, Required<MetricLayoutWithDefault>]
  >;

  const effectiveIconAlign = getEffectiveIconAlign(state);

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
      (state.secondaryAlign ?? LENS_METRIC_STATE_DEFAULTS.secondaryAlign) === preset.secondaryAlign;

    const valueFontModeMatch =
      (state.valueFontMode ?? LENS_METRIC_STATE_DEFAULTS.valueFontMode) ===
      LENS_METRIC_STATE_DEFAULTS.valueFontMode;
    const iconAlignMatch = effectiveIconAlign === LENS_METRIC_STATE_DEFAULTS.iconAlign;

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
