/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { VisualizationContainer } from '../../visualizations/public';
import { ExpressionRenderDefinition } from '../../expressions/common/expression_renderers';
import { TagCloudVisDependencies } from './plugin';
import { TagCloudVisRenderValue } from './tag_cloud_fn';

const TagCloudChart = lazy(() => import('./components/tag_cloud_chart'));

export const getTagCloudVisRenderer: (
  deps: TagCloudVisDependencies
) => ExpressionRenderDefinition<TagCloudVisRenderValue> = ({ colors }) => ({
  name: 'tagloud_vis',
  displayName: 'Tag Cloud visualization',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <VisualizationContainer handlers={handlers}>
        <TagCloudChart
          {...config}
          colors={colors}
          renderComplete={handlers.done}
          fireEvent={handlers.event}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
