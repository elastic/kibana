/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { VisTypePieDependencies } from '../plugin';
import { PARTITION_VIS_RENDERER_NAME } from '../../common/constants';
import { ChartTypes, RenderValue } from '../../common/types';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { extractContainerType, extractVisualizationType } from '../../../common';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionPartitionVis.renderer.partitionVis.pie.displayName', {
      defaultMessage: 'Partition visualization',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionPartitionVis.renderer.partitionVis.pie.helpDescription', {
      defaultMessage: 'Render pie/donut/treemap/mosaic/waffle charts',
    }),
};

const LazyPartitionVisComponent = lazy(() => import('../components/partition_vis_component'));
const PartitionVisComponent = withSuspense(LazyPartitionVisComponent);

const partitionVisRenderer = css({
  position: 'relative',
  width: '100%',
  height: '100%',
});

export const getPartitionVisRenderer: (
  deps: VisTypePieDependencies
) => ExpressionRenderDefinition<RenderValue> = ({ getStartDeps }) => ({
  name: PARTITION_VIS_RENDERER_NAME,
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode,
    { visConfig, visData, visType, syncColors, canNavigateToLens },
    handlers
  ) => {
    const { core, plugins } = getStartDeps();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      const executionContext = handlers.getExecutionContext();
      const containerType = extractContainerType(executionContext);
      const visualizationType = extractVisualizationType(executionContext);

      if (containerType && visualizationType) {
        const events = [
          `render_${visualizationType}_${visType}`,
          canNavigateToLens ? `render_${visualizationType}_${visType}_convertable` : undefined,
        ].filter<string>((event): event is string => Boolean(event));

        plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, events);
      }
      handlers.done();
    };

    const palettesRegistry = await plugins.charts.palettes.getPalettes();

    render(
      <I18nProvider>
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <div css={partitionVisRenderer}>
            <PartitionVisComponent
              chartsThemeService={plugins.charts.theme}
              palettesRegistry={palettesRegistry}
              visParams={visConfig}
              visData={visData}
              visType={visConfig.isDonut ? ChartTypes.DONUT : visType}
              renderComplete={renderComplete}
              fireEvent={handlers.event}
              uiState={handlers.uiState as PersistedState}
              services={{ data: plugins.data, fieldFormats: plugins.fieldFormats }}
              syncColors={syncColors}
            />
          </div>
        </KibanaThemeProvider>
      </I18nProvider>,
      domNode
    );
  },
});
