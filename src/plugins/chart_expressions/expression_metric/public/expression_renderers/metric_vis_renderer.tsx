/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { css } from '@emotion/react';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { IInterpreterRenderHandlers, Datatable } from '@kbn/expressions-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExpressionMetricPluginStart } from '../plugin';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig, VisParams } from '../../common';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { extractContainerType, extractVisualizationType } from '../../../common';

async function metricFilterable(
  dimensions: VisParams['dimensions'],
  table: Datatable,
  hasCompatibleActions?: IInterpreterRenderHandlers['hasCompatibleActions']
) {
  const column = getColumnByAccessor(dimensions.breakdownBy ?? dimensions.metric, table.columns);
  const colIndex = table.columns.indexOf(column!);
  const value = column ? table.rows[0][column.id] : undefined;
  return Boolean(
    await hasCompatibleActions?.({
      name: 'filter',
      data: {
        data: [
          {
            table,
            column: colIndex,
            row: 0,
            value,
          },
        ],
      },
    })
  );
}
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

      const filterable = visData.rows.length
        ? await metricFilterable(
            visConfig.dimensions,
            visData,
            handlers.hasCompatibleActions?.bind(handlers)
          )
        : false;
      const renderComplete = () => {
        const executionContext = handlers.getExecutionContext();
        const containerType = extractContainerType(executionContext);
        const visualizationType = extractVisualizationType(executionContext);

        if (containerType && visualizationType) {
          plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, [
            `render_${visualizationType}_metric`,
          ]);
        }

        handlers.done();
      };

      const { MetricVis } = await import('../components/metric_vis');
      render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <div
            data-test-subj="mtrVis"
            css={css`
              height: 100%;
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <MetricVis
              data={visData}
              config={visConfig}
              renderComplete={renderComplete}
              fireEvent={handlers.event}
              renderMode={handlers.getRenderMode()}
              filterable={filterable}
            />
          </div>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });
};
