/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Simplify } from '../../utils';
import type { LensLayerType } from '../lens_types';
import type {
  LegacyMetricAlignment,
  LegacyMetricArguments,
  LegacyMetricLabelPositionType,
} from './expression_types';

export type LegacyMetricState = Simplify<
  Partial<Pick<LegacyMetricArguments, 'autoScaleMetricAlignment' | 'colorMode' | 'palette'>> & {
    layerId: string;
    accessor?: string;
    layerType: LensLayerType;
    titlePosition?: LegacyMetricLabelPositionType;
    size?: string;
    textAlign?: LegacyMetricAlignment;
  }
>;
