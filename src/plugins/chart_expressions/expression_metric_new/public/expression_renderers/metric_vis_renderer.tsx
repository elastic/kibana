/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './metric_vis.scss';

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig } from '../../common';

const MetricVis = lazy(() => import('../components/metric_vis'));

export const getMetricVisRenderer = (
  theme: ThemeServiceStart
): (() => ExpressionRenderDefinition<MetricVisRenderConfig>) => {
  return () => ({
    name: EXPRESSION_METRIC_NAME,
    displayName: 'metric visualization',
    reuseDomNode: true,
    render: async (domNode, { visData, visConfig }, handlers) => {
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaThemeProvider theme$={theme.theme$}>
          <VisualizationContainer
            data-test-subj="mtrVis"
            className="mtrVis"
            showNoResult={!visData.rows.length}
            handlers={handlers}
          >
            <MetricVis data={visData} config={visConfig} renderComplete={handlers.done} />
          </VisualizationContainer>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });
};
