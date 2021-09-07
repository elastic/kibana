/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { VisualizationContainer } from '../../../visualizations/public';
import { ExpressionRenderDefinition } from '../../../expressions/common/expression_renderers';
import { MetricVisRenderValue } from './metric_vis_fn';
// @ts-ignore
const MetricVisComponent = lazy(() => import('./components/metric_vis_component'));

export const metricVisRenderer: () => ExpressionRenderDefinition<MetricVisRenderValue> = () => ({
  name: 'metric_vis',
  displayName: 'metric visualization',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <VisualizationContainer
        className="mtrVis"
        showNoResult={!visData.rows?.length}
        handlers={handlers}
      >
        <MetricVisComponent
          visData={visData}
          visParams={visConfig}
          renderComplete={handlers.done}
          fireEvent={handlers.event}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
