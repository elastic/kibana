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

import _ from 'lodash';

// TODO: reference to TILE_MAP plugin should be removed
import { ORIGIN } from '../../../../legacy/core_plugins/tile_map/common/origin';

export function mapToLayerWithId(prefix, layer) {
  const clonedLayer = _.cloneDeep(layer);
  clonedLayer.layerId = prefix + '.' + layer.name;
  clonedLayer.isEMS = ORIGIN.EMS === prefix ?  true : false;
  return clonedLayer;
}
