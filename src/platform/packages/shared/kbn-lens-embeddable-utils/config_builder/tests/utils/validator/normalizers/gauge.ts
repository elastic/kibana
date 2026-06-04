/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GaugeVisualizationState } from '@kbn/lens-common';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';

import type { LensAttributes } from '../../../../types';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getCommonNormalizer } from './common';
import { getMetricAccessor } from '../../../../transforms/charts/utils';
import { getContinuity, getRangeValue } from '../../../../transforms/coloring';

type GaugeAttributes = Extract<LensAttributes, { visualizationType: 'lnsGauge' }>;

const ACCESSOR_METRIC = 'gauge_accessor_metric';
const ACCESSOR_MIN = 'gauge_accessor_min';
const ACCESSOR_MAX = 'gauge_accessor_max';
const ACCESSOR_GOAL = 'gauge_accessor_goal';

function getColumnRemapping(viz: GaugeVisualizationState): IdRemapping {
  return [
    [getMetricAccessor(viz), ACCESSOR_METRIC],
    [viz.minAccessor, ACCESSOR_MIN],
    [viz.maxAccessor, ACCESSOR_MAX],
    [viz.goalAccessor, ACCESSOR_GOAL],
  ];
}

/**
 * A gauge SO references a single form-based layer (`viz.layerId`). Some panels
 * carry an extra secondary form-based layer linked via `linkToLayers` (e.g. a
 * trend/reference layer authored alongside the gauge). The transform only emits
 * the gauge's own layer and drops the linked one (and its reference), so strip
 * any non-gauge form-based layer from the original before the common normalizer
 * runs. Runs at order -2 so the dropped layer's reference never reaches the
 * common reference handling (order -1).
 */
const alignExtraLayers: NormalizerConfig<GaugeAttributes> = {
  order: -2,
  original: (attributes) => {
    const gaugeLayerId = (attributes.state.visualization as GaugeVisualizationState).layerId;
    const formBased = attributes.state.datasourceStates.formBased;

    if (!formBased?.layers || !gaugeLayerId) {
      return attributes;
    }

    const removedLayerIds = Object.keys(formBased.layers).filter((id) => id !== gaugeLayerId);
    if (removedLayerIds.length === 0) {
      return attributes;
    }

    for (const id of removedLayerIds) {
      delete formBased.layers[id];
    }

    attributes.references = attributes.references.filter(
      (reference) =>
        !removedLayerIds.some((id) => reference.name === `indexpattern-datasource-layer-${id}`)
    );

    return attributes;
  },
};

const alignId: NormalizerConfig<GaugeAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;

    viz.layerId = DEFAULT_LAYER_ID;

    const metricAccessor = getMetricAccessor(viz);
    if (metricAccessor) {
      viz.metricAccessor = ACCESSOR_METRIC;
      // Remove the legacy `accessor` alias if present
      delete (viz as { accessor?: string }).accessor;
    }
    if (viz.minAccessor) viz.minAccessor = ACCESSOR_MIN;
    if (viz.maxAccessor) viz.maxAccessor = ACCESSOR_MAX;
    if (viz.goalAccessor) viz.goalAccessor = ACCESSOR_GOAL;

    return attributes;
  },
};

const alignLegacyTypes: NormalizerConfig<GaugeAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;

    // Apply transform defaults that legacy SOs may omit
    viz.shape = viz.shape ?? 'horizontalBullet';
    viz.ticksPosition = viz.ticksPosition ?? 'bands';
    viz.labelMajorMode = viz.labelMajorMode ?? 'auto';
    // The state->API->state round-trip emits NO_COLOR unless colorMode is
    // explicitly 'palette', so a missing colorMode resolves to 'none'.
    viz.colorMode = viz.colorMode ?? 'none';

    // An empty `labelMinor` is equivalent to it being absent; the transform only
    // emits it when truthy.
    if (viz.labelMinor === '') {
      delete viz.labelMinor;
    }

    // `isStaticValue` is a runtime-only flag on static_value columns that the
    // transform does not emit. Drop it from the original to compare cleanly.
    for (const layer of Object.values(attributes.state.datasourceStates.formBased?.layers ?? {})) {
      for (const col of Object.values(layer.columns)) {
        delete (col as { isStaticValue?: boolean }).isStaticValue;
      }
    }

    return attributes;
  },
  transformed: (attributes) => {
    const viz = attributes.state.visualization as GaugeVisualizationState;

    // The transform always emits optional accessor and label keys, even when
    // undefined. The original side only sets the keys it actually carries, so
    // strip the undefined-valued ones to compare apples to apples.
    for (const key of ['minAccessor', 'maxAccessor', 'goalAccessor', 'labelMinor'] as const) {
      if (viz[key] === undefined) {
        delete viz[key];
      }
    }

    // Remove transform-added column properties not in the original
    for (const layer of Object.values(attributes.state.datasourceStates.formBased?.layers ?? {})) {
      for (const col of Object.values(layer.columns)) {
        delete (col as { params?: { parentFormat?: unknown } }).params?.parentFormat;
        if (col.operationType === 'count') {
          delete (col as { params?: unknown }).params;
        }
      }
    }

    return attributes;
  },
};

// Canonical ES|QL column order emitted by the transform's `getValueColumns`.
const ESQL_COLUMN_ORDER = [ACCESSOR_METRIC, ACCESSOR_MAX, ACCESSOR_MIN, ACCESSOR_GOAL];

/**
 * For ES|QL gauges the transform emits only the accessor columns (metric, max,
 * min, goal in that order) and drops any extra/duplicate columns. Align the
 * original textBased columns to that canonical set and order.
 */
const alignESQLColumns: NormalizerConfig<GaugeAttributes> = {
  original: (attributes) => {
    const textBasedLayers = attributes.state.datasourceStates.textBased?.layers ?? {};
    for (const layer of Object.values(textBasedLayers)) {
      const byId = new Map(layer.columns.map((col) => [col.columnId, col]));
      layer.columns = ESQL_COLUMN_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    }
    return attributes;
  },
};

/**
 * Gauge-specific color-by-value palette normalizer.
 *
 * This mirrors the exact SO -> API -> SO contract implemented by
 * `fromColorByValueLensStateToAPI` / `fromColorByValueAPIToLensState`
 * (transforms/coloring/coloring.ts, post-#272123). Every adjustment below was
 * validated against a real round-trip of the failing integration panels: in all
 * cases the round-tripped palette renders identically to the original, the diffs
 * are purely the transform canonicalizing how open/closed bounds are encoded.
 *
 * Contract (continuity is the source of truth for open/closed bounds):
 * - `continuity = params.continuity ?? getContinuity(rangeMin, rangeMax)`.
 * - Open above (`above`/`all`): top band is unbounded, so `rangeMax` and the last
 *   stop are encoded as `null` (e.g. Tomcat/IBM MQ/MongoDB/PostgreSQL/vSphere:
 *   `rangeMax 100 -> null`, last `stop 100 -> null`).
 * - Closed above (`none`/`below`): the last step keeps `lte: rangeMax`, so the
 *   last stop is canonicalized to `rangeMax` (e.g. Gigamon: last `stop 8001 ->
 *   10000`).
 * - Open below (`below`/`all`): bottom band is unbounded, so `rangeMin` is encoded
 *   as `null`.
 * - Legacy (non-`custom`) palettes that need the bwc shift (see
 *   https://github.com/elastic/kibana/issues/251135) reconstruct stops as
 *   `[rangeMin, ...originalStops[1..]]`; combined with open-below this nulls the
 *   first stop (e.g. Nvidia `temperature`: `rangeMin 0 -> null`, first
 *   `stop 25 -> null`).
 */
const alignGaugePalette: NormalizerConfig<GaugeAttributes> = {
  original: (attributes) => {
    const palette = attributes.state.visualization.palette as
      | PaletteOutput<CustomPaletteParams>
      | undefined;
    const params = palette?.params;

    if (!palette || !params || !params.stops) {
      return attributes;
    }

    const rangeMin = getRangeValue(params.rangeMin);
    const rangeMax = getRangeValue(params.rangeMax);
    const isLegacy = palette.name !== 'custom';
    const continuity = params.continuity ?? getContinuity(rangeMin, rangeMax);
    const isOpenBelow = continuity === 'below' || continuity === 'all';
    const isOpenAbove = continuity === 'above' || continuity === 'all';

    const stops = params.stops;
    const needsPaletteShift =
      isLegacy &&
      ((rangeMin !== null && rangeMin === stops.at(0)?.stop) ||
        (rangeMax !== null && rangeMax !== stops.at(-1)?.stop));

    if (needsPaletteShift) {
      // The legacy bwc shift + reverse reconstruction collapses to: keep every
      // stop boundary except the first, which becomes `rangeMin`.
      stops.forEach((stop, i) => {
        if (i === 0) {
          stop.stop = (isOpenBelow ? null : rangeMin) as unknown as number;
        }
      });
    } else if (stops.length > 1) {
      // Multi-stop palette: the last step's upper bound is `rangeMax` (closed)
      // or open (`null`).
      //
      // A single-stop open-above palette is left untouched: the transform encodes
      // its openness by appending a trailing same-color step and then merges it
      // back via `mergeTrailingSameColorStep`, so the lone stop value round-trips
      // unchanged (e.g. ActiveMQ Broker Memory: single `stop: 100` survives).
      const lastStop = stops.at(-1);
      if (lastStop) {
        lastStop.stop = (isOpenAbove ? null : rangeMax) as unknown as number;
      }
    }

    params.rangeMin = (isOpenBelow ? null : rangeMin) as unknown as number;
    params.rangeMax = (isOpenAbove ? null : rangeMax) as unknown as number;
    params.continuity = continuity;

    // The transform only emits `colorStops` for non-legacy (`custom`) palettes.
    if (isLegacy) {
      delete params.colorStops;
    }

    // The transform always sets params.name from the root palette name.
    if (params.name === undefined && palette.name) {
      params.name = palette.name;
    }

    return attributes;
  },
  ignore: [
    // The transform recomputes these from the resulting stops; they carry no
    // rendering information and the original frequently omits or mis-counts them.
    'state.visualization.palette.params.maxSteps', // recomputed as max(5, stops.length)
    'state.visualization.palette.params.steps', // recomputed as stops.length
    'state.visualization.palette.params.progression', // deprecated, always defaulted to 'fixed'
    'state.visualization.palette.params.reverse', // always pre-applied to stops during the transform
  ],
};

export const normalizeGauge = mergeNormalizers<GaugeAttributes>([
  getCommonNormalizer<GaugeAttributes>(({ state: { visualization } }) => ({
    layerRemapping: [[(visualization as GaugeVisualizationState).layerId, DEFAULT_LAYER_ID]],
    columnRemapping: getColumnRemapping(visualization as GaugeVisualizationState),
  })),
  alignExtraLayers,
  alignId,
  alignLegacyTypes,
  alignESQLColumns,
  alignGaugePalette,
]);
