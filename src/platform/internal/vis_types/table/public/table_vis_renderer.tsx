/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { METRIC_TYPE } from '@kbn/analytics';
import { CoreStart, KibanaExecutionContext } from '@kbn/core/public';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { TableVisRenderValue } from './table_vis_fn';

const TableVisualizationComponent = lazy(() => import('./components/table_visualization'));

/** @internal **/
const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

export const getTableVisRenderer: (
  core: CoreStart,
  usageCollection: UsageCollectionStart
) => ExpressionRenderDefinition<TableVisRenderValue> = (core, usageCollection) => ({
  name: 'table_vis',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig, canNavigateToLens }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const showNoResult =
      visData.table?.rows.length === 0 || (!visData.table && visData.tables.length === 0);

    const renderCompete = () => {
      const containerType = extractContainerType(handlers.getExecutionContext());
      const visualizationType = 'agg_based';

      if (containerType) {
        const counterEvents = [
          `render_${visualizationType}_table`,
          !visData.table ? `render_${visualizationType}_table_split` : undefined,
          canNavigateToLens ? `render_${visualizationType}_table_convertable` : undefined,
        ].filter(Boolean) as string[];

        usageCollection.reportUiCounter(containerType, METRIC_TYPE.COUNT, counterEvents);
      }

      handlers.done();
    };

    render(
      <KibanaThemeProvider theme$={core.theme.theme$}>
        <VisualizationContainer
          data-test-subj="tbvChartContainer"
          handlers={handlers}
          renderComplete={renderCompete}
          showNoResult={showNoResult}
        >
          <TableVisualizationComponent
            core={core}
            handlers={handlers}
            visData={visData}
            visConfig={visConfig}
            renderComplete={renderCompete}
          />
        </VisualizationContainer>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
