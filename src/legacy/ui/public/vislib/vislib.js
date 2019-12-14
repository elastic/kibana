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

import './lib/types/pie';
import './lib/types/point_series';
import './lib/types';
import './lib/layout/layout_types';
import './lib/data';
import './visualizations/vis_types';
import { mappedColors } from '../vis/components/color/mapped_colors';
import { VislibVisProvider } from './vis';

// prefetched for faster optimization runs
// end prefetching

/**
 * Provides the Kibana4 Visualization Library
 *
 * @module vislib
 * @main vislib
 * @return {Object} Contains the version number and the Vis Class for creating visualizations
 */
export function VislibProvider(Private, $rootScope) {
  $rootScope.$on('$routeChangeStart', () => mappedColors.purge());

  return {
    version: '0.0.0',
    Vis: Private(VislibVisProvider),
  };
}
