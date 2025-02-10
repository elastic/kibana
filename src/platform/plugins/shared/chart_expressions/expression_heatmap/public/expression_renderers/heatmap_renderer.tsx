/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { getTimeZone } from '@kbn/visualization-utils';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  ChartSizeEvent,
  extractContainerType,
  extractVisualizationType,
} from '@kbn/chart-expressions-common';
import { css } from '@emotion/react';
import { UseEuiTheme } from '@elastic/eui';
import { MultiFilterEvent } from '../../common/types';
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

interface ExpressioHeatmapRendererDependencies {
  getStartDeps: StartServicesGetter<ExpressionHeatmapPluginStart>;
}

const heatmapContainerCss = ({ euiTheme }: UseEuiTheme) =>
  css({
    width: '100%',
    height: '100%',
    padding: euiTheme.size.s,
    // the FocusTrap is adding extra divs which are making the visualization redraw twice
    // with a visible glitch. This make the chart library resilient to this extra reflow
    overflow: 'auto hidden',
    userSelect: 'text',
  });

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
    const onClickMultiValue = (data: MultiFilterEvent['data']) => {
      handlers.event({ name: 'multiFilter', data });
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

    const chartSizeEvent: ChartSizeEvent = {
      name: 'chartSize',
      data: {
        maxDimensions: {
          x: { value: 100, unit: 'percentage' },
          y: { value: 100, unit: 'percentage' },
        },
      },
    };

    handlers.event(chartSizeEvent);

    const timeZone = getTimeZone(getUISettings());
    const { HeatmapComponent } = await import('../components/heatmap_component');
    const { isInteractive } = handlers;

    render(
      <KibanaRenderContextProvider {...core}>
        <div className="eui-scrollBar" css={heatmapContainerCss} data-test-subj="heatmapChart">
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
            onClickMultiValue={onClickMultiValue}
          />
        </div>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
