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
import { TileMapVisualizationDependencies } from './plugin';
import { TileMapVisRenderValue } from './tile_map_fn';

const TileMapVisualization = lazy(() => import('./tile_map_visualization_component'));

export const getTileMapRenderer: (
  deps: TileMapVisualizationDependencies
) => ExpressionRenderDefinition<TileMapVisRenderValue> = (deps) => ({
  name: 'tile_map_vis',
  reuseDomNode: true,
  render: async (domNode, { visConfig, visData }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <VisualizationContainer handlers={handlers}>
        <TileMapVisualization
          deps={deps}
          handlers={handlers}
          visData={visData}
          visConfig={visConfig}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
