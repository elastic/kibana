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

import chrome from 'ui/chrome';

export { AggGroupNames, VisOptionsProps } from 'ui/vis/editors/default';
export { Schemas } from 'ui/vis/editors/default/schemas';
export { RangeValues, RangesParamEditor } from 'ui/vis/editors/default/controls/ranges';
export { ColorSchema, ColorSchemas, colorSchemas, getHeatmapColors } from 'ui/color_maps';
export { AggConfig, Vis, VisParams } from 'ui/vis';
export { AggType } from 'ui/agg_types';
export { CUSTOM_LEGEND_VIS_TYPES, VisLegend } from 'ui/vis/vis_types/vislib_vis_legend';
// @ts-ignore
export { Tooltip } from 'ui/vis/components/tooltip';
// @ts-ignore
export { SimpleEmitter } from 'ui/utils/simple_emitter';
// @ts-ignore
export { Binder } from 'ui/binder';

// TODO: Migrate to top-level imports
// @ts-ignore
export { vislibColor } from 'ui/vis/components/color/color';
// @ts-ignore
export { tabifyAggResponse } from 'ui/agg_response/tabify';
// @ts-ignore
export { mappedColors } from 'ui/vis/components/color/mapped_colors';
export { getFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';
export { mountReactNode } from '../../../../core/public/utils';
export { dispatchRenderComplete } from '../../../../plugins/kibana_utils/public';
export { chrome };
/* eslint-disable prettier/prettier */
export {
  setHierarchicalTooltipFormatter,
  getHierarchicalTooltipFormatter,
  // @ts-ignore
} from 'ui/vis/components/tooltip/_hierarchical_tooltip_formatter';
export {
  setPointSeriesTooltipFormatter,
  getPointSeriesTooltipFormatter,
  // @ts-ignore
} from 'ui/vis/components/tooltip/_pointseries_tooltip_formatter';
export {
  vislibSeriesResponseHandlerProvider,
  vislibSlicesResponseHandlerProvider,
  // @ts-ignore
} from 'ui/vis/response_handlers/vislib';
