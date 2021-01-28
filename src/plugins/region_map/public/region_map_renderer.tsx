/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
