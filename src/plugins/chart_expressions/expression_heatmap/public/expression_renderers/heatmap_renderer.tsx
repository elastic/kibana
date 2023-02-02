/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { extractContainerType, extractVisualizationType } from '@kbn/chart-expressions-common';
import { ExpressionHeatmapPluginStart } from '../plugin';
import {
  EXPRESSION_HEATMAP_NAME,
  HeatmapExpressionProps,
  FilterEvent,
  BrushEvent,
} from '../../common';
import {
  getDatatableUtilities,
  getFormatService,
  getPaletteService,
  getUISettings,
} from '../services';
import { getTimeZone } from '../utils/get_timezone';

interface ExpressioHeatmapRendererDependencies {
  getStartDeps: StartServicesGetter<ExpressionHeatmapPluginStart>;
}

export const heatmapRenderer: (
  deps: ExpressioHeatmapRendererDependencies
) => ExpressionRenderDefinition<HeatmapExpressionProps> = ({ getStartDeps }) => ({
  name: EXPRESSION_HEATMAP_NAME,
  displayName: i18n.translate('expressionHeatmap.visualizationName', {
    defaultMessage: 'Heatmap',
  }),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    const { core, plugins } = getStartDeps();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const onClickValue = (data: FilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: BrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };

    const renderComplete = () => {
      const executionContext = handlers.getExecutionContext();
      const containerType = extractContainerType(executionContext);
      const visualizationType = extractVisualizationType(executionContext);

      if (containerType && visualizationType) {
        const events = [
          `render_${visualizationType}_${EXPRESSION_HEATMAP_NAME}`,
          config.canNavigateToLens
            ? `render_${visualizationType}_${EXPRESSION_HEATMAP_NAME}_convertable`
            : undefined,
        ].filter<string>((event): event is string => Boolean(event));

        plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, events);
      }

      handlers.done();
    };

    const timeZone = getTimeZone(getUISettings());
    const { HeatmapComponent } = await import('../components/heatmap_component');
    const { isInteractive } = handlers;

    render(
      <KibanaThemeProvider theme$={core.theme.theme$}>
        <div className="heatmap-container" data-test-subj="heatmapChart">
          <HeatmapComponent
            {...config}
            onClickValue={onClickValue}
            onSelectRange={onSelectRange}
            timeZone={timeZone}
            datatableUtilities={getDatatableUtilities()}
            formatFactory={getFormatService().deserialize}
            chartsThemeService={plugins.charts.theme}
            paletteService={getPaletteService()}
            renderComplete={renderComplete}
            uiState={handlers.uiState as PersistedState}
            interactive={isInteractive()}
            chartsActiveCursorService={plugins.charts.activeCursor}
            syncTooltips={config.syncTooltips}
            syncCursor={config.syncCursor}
          />
        </div>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
