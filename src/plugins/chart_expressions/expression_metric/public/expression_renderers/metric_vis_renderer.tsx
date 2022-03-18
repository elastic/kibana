/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../kibana_react/public';
import { VisualizationContainer } from '../../../../visualizations/public';
import { ExpressionRenderDefinition } from '../../../../expressions/common/expression_renderers';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig } from '../../common';

// @ts-ignore
const MetricVisComponent = lazy(() => import('../components/metric_component'));

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
            showNoResult={!visData.rows?.length}
            handlers={handlers}
          >
            <MetricVisComponent
              visData={visData}
              visParams={visConfig}
              renderComplete={handlers.done}
              fireEvent={handlers.event}
            />
          </VisualizationContainer>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });
};
