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
import { ChartsPluginSetup } from '../../charts/public';

import { VisTypeVislibCoreSetup } from './plugin';
import { VislibRenderValue, vislibVisName } from './vis_type_vislib_vis_fn';

function shouldShowNoResultsMessage(visData: any, visType: string): boolean {
  if (['goal', 'gauge'].includes(visType)) {
    return false;
  }

  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

const VislibWrapper = lazy(() => import('./vis_wrapper'));

export const getVislibVisRenderer: (
  core: VisTypeVislibCoreSetup,
  charts: ChartsPluginSetup
) => ExpressionRenderDefinition<VislibRenderValue> = (core, charts) => ({
  name: vislibVisName,
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(config.visData, config.visType);

    handlers.onDestroy(() => unmountComponentAtNode(domNode));

    render(
      <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
        <VislibWrapper {...config} core={core} charts={charts} handlers={handlers} />
      </VisualizationContainer>,
      domNode
    );
  },
});
