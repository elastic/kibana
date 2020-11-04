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
import { VisParams } from './types';

import { VisComponentType } from './vis_component';
import { RenderValue, visName } from './xy_vis_fn';

function shouldShowNoResultsMessage(visParams: VisParams, visData: any, visType: string): boolean {
  if (visParams.dimensions.splitRow || visParams.dimensions.splitRow) {
    // render SplitChartWarning
    return false;
  }

  if (['goal', 'gauge'].includes(visType as string)) {
    return false;
  }

  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

// @ts-ignore
const VisComponent = lazy<VisComponentType>(() => import('./vis_component'));

export const xyVisRenderer: ExpressionRenderDefinition<RenderValue> = {
  name: visName,
  displayName: 'XY visualization',
  reuseDomNode: true,
  render: (domNode, { visData, visConfig, visType }, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(visConfig, visData, visType);

    handlers.onDestroy(() => unmountComponentAtNode(domNode));

    render(
      <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
        <VisComponent
          visParams={visConfig}
          visData={visData}
          renderComplete={handlers.done}
          fireEvent={handlers.event}
          uiState={handlers.uiState}
        />
      </VisualizationContainer>,
      domNode
    );
  },
};
