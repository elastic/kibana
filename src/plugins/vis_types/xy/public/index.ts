/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110891
/* eslint-disable @kbn/eslint/no_export_all */

import { VisTypeXyPlugin as Plugin } from './plugin';

export type { VisTypeXyPluginSetup } from './plugin';

// TODO: Remove when vis_type_vislib is removed
// https://github.com/elastic/kibana/issues/56143
export type {
  CategoryAxis,
  ThresholdLine,
  ValueAxis,
  Grid,
  SeriesParam,
  Dimension,
  Dimensions,
} from './types';
export { ScaleType, AxisType } from './types';
export type { ValidationVisOptionsProps } from './editor/components/common/validation_wrapper';
export { TruncateLabelsOption } from './editor/components/common/truncate_labels';
export { getPositions } from './editor/positions';
export { getScaleTypes } from './editor/scale_types';
export { getAggId } from './config/get_agg_id';

// Export common types
export * from '../common';

export function plugin() {
  return new Plugin();
}
