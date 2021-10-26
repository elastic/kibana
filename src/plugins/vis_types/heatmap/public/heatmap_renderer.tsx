/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { ExpressionRenderDefinition } from '../../../expressions/public';
import { VisualizationContainer } from '../../../visualizations/public';
import type { PersistedState } from '../../../visualizations/public';
import { VisTypeHeatmapDependencies } from './plugin';

import { HeatmapRendererConfig, vislibHeatmapName } from './heatmap_fn';

const HeatmapComponent = lazy(() => import('./heatmap_component'));

function shouldShowNoResultsMessage(visData: any): boolean {
  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

export const getHeatmapVisRenderer: (
  deps: VisTypeHeatmapDependencies
) => ExpressionRenderDefinition<HeatmapRendererConfig> = ({ theme, palettes, getStartDeps }) => ({
  name: vislibHeatmapName,
  displayName: 'Heatmap visualization',
  reuseDomNode: true,
  render: async (domNode, { visConfig, visData, syncColors }, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(visData);

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const services = await getStartDeps();
    const palettesRegistry = await palettes.getPalettes();

    render(
      <I18nProvider>
        <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
          <HeatmapComponent
            chartsThemeService={theme}
            palettesRegistry={palettesRegistry}
            visParams={visConfig}
            visData={visData}
            renderComplete={handlers.done}
            fireEvent={handlers.event}
            uiState={handlers.uiState as PersistedState}
            services={services.data}
            syncColors={syncColors}
          />
        </VisualizationContainer>
      </I18nProvider>,
      domNode
    );
  },
});
