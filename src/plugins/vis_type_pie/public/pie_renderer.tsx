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

import { ExpressionRenderDefinition } from '../../expressions/public';
import { VisualizationContainer } from '../../visualizations/public';
// import { SplitChartWarning } from './components';

import { RenderValue, vislibPieName } from './pie_fn';

const PieComponent = lazy(() => import('./pie_component'));

function shouldShowNoResultsMessage(visData: any): boolean {
  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

export const pieVisRenderer: ExpressionRenderDefinition<RenderValue> = {
  name: vislibPieName,
  displayName: 'Pie visualization',
  reuseDomNode: true,
  render: (domNode, { visConfig, visData, visFormattedData }, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(visData);
    const isSplitChart = Boolean(visConfig.dimensions.splitRow);

    handlers.onDestroy(() => unmountComponentAtNode(domNode));
    render(
      <>
        {/* {isSplitChart && <SplitChartWarning />} */}
        <VisualizationContainer handlers={handlers} showNoResult={showNoResult || isSplitChart}>
          <PieComponent
            visParams={visConfig}
            visData={visData}
            visFormattedData={visFormattedData}
            renderComplete={handlers.done}
            fireEvent={handlers.event}
            uiState={handlers.uiState}
          />
        </VisualizationContainer>
      </>,
      domNode
    );
  },
};
