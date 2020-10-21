/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from 'kibana/public';
import { VisualizationContainer } from '../../visualizations/public';
import { ExpressionRenderDefinition } from '../../expressions/common/expression_renderers';
import { TableVisRenderValue } from './table_vis_fn';

const TableVisualizationComponent = lazy(() => import('./components/table_visualization'));

export const getTableVisRenderer: (
  core: CoreStart
) => ExpressionRenderDefinition<TableVisRenderValue> = (core) => ({
  name: 'table_vis',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const showNoResult =
      visData.table?.rows.length === 0 || (!visData.table && visData.tables.length === 0);

    render(
      <VisualizationContainer
        data-test-subj="tbvChartContainer"
        handlers={handlers}
        showNoResult={showNoResult}
      >
        <TableVisualizationComponent
          core={core}
          handlers={handlers}
          visData={visData}
          visConfig={visConfig}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
