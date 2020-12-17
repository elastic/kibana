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

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { VisualizationContainer } from '../../visualizations/public';
import { RegionMapVisualizationDependencies } from './plugin';
import { RegionMapVisRenderValue } from './region_map_fn';

const RegionMapVisualization = lazy(() => import('./region_map_visualization_component'));

export const getRegionMapRenderer: (
  deps: RegionMapVisualizationDependencies
) => ExpressionRenderDefinition<RegionMapVisRenderValue> = (deps) => ({
  name: 'region_map_vis',
  reuseDomNode: true,
  render: async (domNode, { visConfig, visData }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <VisualizationContainer handlers={handlers}>
        <RegionMapVisualization
          deps={deps}
          handlers={handlers}
          visConfig={visConfig}
          visData={visData}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
