/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';
import { VisualizationContainer } from '@kbn/visualizations-common';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';

import type { VisTypeVislibCoreSetup } from './plugin';
import type { VislibRenderValue } from './vis_type_vislib_vis_fn';
import { vislibVisName } from './vis_type_vislib_vis_fn';
import type { VislibChartType } from './types';

const VislibWrapper = lazy(() => import('./vis_wrapper'));

function shouldShowNoResultsMessage(visData: any, visType: VislibChartType): boolean {
  if (['goal', 'gauge'].includes(visType as string)) {
    return false;
  }

  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

export const getVislibVisRenderer: (
  core: VisTypeVislibCoreSetup,
  charts: ChartsPluginSetup
) => ExpressionRenderDefinition<VislibRenderValue> = (core, charts) => ({
  name: vislibVisName,
  displayName: 'Vislib visualization',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    const [startServices] = await core.getStartServices();
    const showNoResult = shouldShowNoResultsMessage(config.visData, config.visType);

    handlers.onDestroy(() => unmountComponentAtNode(domNode));

    render(
      <KibanaRenderContextProvider {...startServices}>
        <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
          <VislibWrapper {...config} core={core} charts={charts} handlers={handlers} />
        </VisualizationContainer>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
