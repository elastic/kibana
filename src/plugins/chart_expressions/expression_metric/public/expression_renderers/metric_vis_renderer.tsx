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
import {
  ExpressionValueVisDimension,
  VisualizationContainer,
} from '@kbn/visualizations-plugin/public';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common/expression_renderers';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import type { Datatable } from '@kbn/expressions-plugin';
import { METRIC_TYPE } from '@kbn/analytics';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { ExpressionMetricPluginStart } from '../plugin';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig, VisParams } from '../../common';
import { extractOriginatingApp } from '../../../common';

// @ts-ignore
const MetricVisComponent = lazy(() => import('../components/metric_component'));

async function metricFilterable(
  dimensions: VisParams['dimensions'],
  table: Datatable,
  handlers: IInterpreterRenderHandlers
) {
  return Promise.all(
    dimensions.metrics.map(async (metric: string | ExpressionValueVisDimension) => {
      const column = getColumnByAccessor(metric, table.columns);
      const colIndex = table.columns.indexOf(column!);
      return Boolean(
        await handlers.hasCompatibleActions?.({
          name: 'filter',
          data: {
            data: [
              {
                table,
                column: colIndex,
                row: 0,
              },
            ],
          },
        })
      );
    })
  );
}

interface ExpressionMetricVisRendererDependencies {
  getStartDeps: StartServicesGetter<ExpressionMetricPluginStart>;
}

export const getMetricVisRenderer: (
  deps: ExpressionMetricVisRendererDependencies
) => ExpressionRenderDefinition<MetricVisRenderConfig> = ({ getStartDeps }) => ({
  name: EXPRESSION_METRIC_NAME,
  displayName: 'metric visualization',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig }, handlers) => {
    const { core, plugins } = getStartDeps();

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

    const filterable = await metricFilterable(visConfig.dimensions, visData, handlers);

    render(
      <KibanaThemeProvider theme$={core.theme.theme$}>
        <VisualizationContainer
          data-test-subj="mtrVis"
          className="mtrVis"
          showNoResult={!visData.rows?.length}
          handlers={handlers}
        >
          <MetricVisComponent
            visData={visData}
            visParams={visConfig}
            renderComplete={renderComplete}
            fireEvent={handlers.event}
            filterable={filterable}
          />
        </VisualizationContainer>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
