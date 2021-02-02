/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { VisTypeXyPlugin as Plugin } from './plugin';

export { VisTypeXyPluginSetup } from './plugin';

// TODO: Remove when vis_type_vislib is removed
// https://github.com/elastic/kibana/issues/56143
export {
  CategoryAxis,
  ThresholdLine,
  ValueAxis,
  Grid,
  SeriesParam,
  Dimension,
  Dimensions,
  ScaleType,
  AxisType,
  HistogramParams,
  DateHistogramParams,
} from './types';
export type { ValidationVisOptionsProps } from './editor/components/common/validation_wrapper';
export { TruncateLabelsOption } from './editor/components/common/truncate_labels';
export { getPositions } from './editor/positions';
export { getScaleTypes } from './editor/scale_types';
export { xyVisTypes } from './vis_types';
export { getAggId } from './config/get_agg_id';

// Export common types
export * from '../common';

export function plugin() {
  return new Plugin();
}
