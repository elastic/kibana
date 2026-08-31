/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegacyMetricState } from '@kbn/lens-common';

import type { LensAttributes } from '../../../../types';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getCommonNormalizer, getPaletteNormalizer } from './common';

type LegacyMetricAttributes = Extract<LensAttributes, { visualizationType: 'lnsLegacyMetric' }>;

function getColumnRemapping({ accessor }: LegacyMetricState): IdRemapping {
  return [[accessor, 'legacy_metric_accessor']];
}

const alignId: NormalizerConfig<LegacyMetricAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;

    viz.layerId = DEFAULT_LAYER_ID;

    if (viz.accessor) {
      viz.accessor = 'legacy_metric_accessor';
    }

    return attributes;
  },
};

const alignLegacyTypes: NormalizerConfig<LegacyMetricAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;

    if (!viz.colorMode) {
      viz.colorMode = 'None';
    }

    return attributes;
  },
};

export const normalizeLegacyMetric = mergeNormalizers<LegacyMetricAttributes>([
  getCommonNormalizer<LegacyMetricAttributes>(({ state: { visualization } }) => ({
    layerRemapping: [[visualization.layerId, DEFAULT_LAYER_ID]],
    columnRemapping: getColumnRemapping(visualization),
  })),
  alignId,
  alignLegacyTypes,
  getPaletteNormalizer<LegacyMetricAttributes>('state.visualization.palette', () => true),
]);
