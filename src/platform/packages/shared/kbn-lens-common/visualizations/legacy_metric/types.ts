/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricArguments as LegacyMetricArguments } from '@kbn/expression-legacy-metric-vis-plugin/common';
import type { $Values } from '@kbn/utility-types';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { Simplify } from '@kbn/chart-expressions-common';
import type { LensLayerType } from '../types';
import type { LEGACY_METRIC_LABEL_POSITION } from './constants';

export type LegacyMetricLabelPositionType = $Values<typeof LEGACY_METRIC_LABEL_POSITION>;
export type LegacyMetricAlignment = 'left' | 'center' | 'right';

export type LegacyMetricState = Simplify<
  Partial<Pick<LegacyMetricArguments, 'autoScaleMetricAlignment' | 'colorMode'>> & {
    layerId: string;
    accessor?: string;
    layerType: LensLayerType;
    titlePosition?: LegacyMetricLabelPositionType;
    size?: string;
    textAlign?: LegacyMetricAlignment;
    palette?: PaletteOutput<CustomPaletteParams>;
  }
>;
