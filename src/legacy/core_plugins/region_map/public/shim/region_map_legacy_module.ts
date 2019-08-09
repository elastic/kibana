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

import { once } from 'lodash';
// @ts-ignore
import { uiModules } from 'ui/modules';

import 'ui/vis/map/service_settings';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';

// @ts-ignore
import { RegionMapVisParams } from '../region_map_vis_params';

/** @internal */
export const initTileMapLegacyModule = once((): void => {
  uiModules
    // TODO: Region Map Plugin uses wmsOptions directive from the kibana/tile_map module.
    // in future this reference should be removed
    .get('kibana/region_map', ['kibana', 'kibana/tile_map'])
    .directive('regionMapVisParams', RegionMapVisParams);
});
