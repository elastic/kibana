/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { css } from '@emotion/react';
import { Datatable } from '@kbn/expressions-plugin';
import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig, VisParams } from '../../common';

const MetricVis = lazy(() => import('../components/metric_vis'));

async function metricFilterable(
  dimensions: VisParams['dimensions'],
  table: Datatable,
  hasCompatibleActions?: IInterpreterRenderHandlers['hasCompatibleActions']
) {
  const column = getColumnByAccessor(dimensions.breakdownBy ?? dimensions.metric, table.columns);
  const colIndex = table.columns.indexOf(column!);
  return Boolean(
    await hasCompatibleActions?.({
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
}

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

      const filterable = await metricFilterable(
        visConfig.dimensions,
        visData,
        handlers.hasCompatibleActions?.bind(handlers)
      );

      render(
        <KibanaThemeProvider theme$={theme.theme$}>
          <VisualizationContainer
            data-test-subj="mtrVis"
            css={css`
              height: 100%;
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
            handlers={handlers}
          >
            <MetricVis
              data={visData}
              config={visConfig}
              renderComplete={() => handlers.done()}
              fireEvent={handlers.event}
              renderMode={handlers.getRenderMode()}
              filterable={filterable}
            />
          </VisualizationContainer>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });
};
