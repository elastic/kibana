/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
