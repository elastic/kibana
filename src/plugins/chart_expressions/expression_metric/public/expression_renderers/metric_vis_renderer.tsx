/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { css } from '@emotion/react';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpressionMetricPluginStart } from '../plugin';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig } from '../../common';
import { extractOriginatingApp } from '../../../common';

const MetricVis = lazy(() => import('../components/metric_vis'));

interface ExpressionMetricVisRendererDependencies {
  getStartDeps: StartServicesGetter<ExpressionMetricPluginStart>;
}

export const getMetricVisRenderer = (
  deps: ExpressionMetricVisRendererDependencies
): (() => ExpressionRenderDefinition<MetricVisRenderConfig>) => {
  return () => ({
    name: EXPRESSION_METRIC_NAME,
    displayName: 'metric visualization',
    reuseDomNode: true,
    render: async (domNode, { visData, visConfig }, handlers) => {
      const { core, plugins } = deps.getStartDeps();

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      const renderComplete = () => {
        const originatingApp = extractOriginatingApp(handlers.getExecutionContext());

        if (originatingApp) {
          plugins.usageCollection?.reportUiCounter(originatingApp, METRIC_TYPE.COUNT, [
            `render_${originatingApp}_metric`,
          ]);
        }

        handlers.done();
      };

      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <VisualizationContainer
            data-test-subj="mtrVis"
            css={css`
              height: 100%;
              width: 100%;
            `}
            showNoResult={!visData.rows.length}
            handlers={handlers}
          >
            <MetricVis data={visData} config={visConfig} renderComplete={renderComplete} />
          </VisualizationContainer>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });
};
