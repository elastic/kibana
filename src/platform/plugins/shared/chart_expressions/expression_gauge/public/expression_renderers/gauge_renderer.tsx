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
import { css } from '@emotion/react';
import { render, unmountComponentAtNode } from 'react-dom';
import { PersistedState } from '@kbn/visualizations-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  createPerformanceTracker,
  PERFORMANCE_TRACKER_MARKS,
  PERFORMANCE_TRACKER_TYPES,
} from '@kbn/ebt-tools';
import {
  ChartSizeEvent,
  extractContainerType,
  extractVisualizationType,
} from '@kbn/chart-expressions-common';
import { ExpressionGaugePluginStart } from '../plugin';
import { EXPRESSION_GAUGE_NAME, GaugeExpressionProps, GaugeShapes } from '../../common';
import { getFormatService, getPaletteService } from '../services';

interface ExpressionGaugeRendererDependencies {
  getStartDeps: StartServicesGetter<ExpressionGaugePluginStart>;
}

export const gaugeRenderer: (
  deps: ExpressionGaugeRendererDependencies
) => ExpressionRenderDefinition<GaugeExpressionProps> = ({ getStartDeps }) => ({
  name: EXPRESSION_GAUGE_NAME,
  displayName: i18n.translate('expressionGauge.renderer.visualizationName', {
    defaultMessage: 'Gauge',
  }),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    const performanceTracker = createPerformanceTracker({
      type: PERFORMANCE_TRACKER_TYPES.PANEL,
      subType: EXPRESSION_GAUGE_NAME,
    });

    performanceTracker.mark(PERFORMANCE_TRACKER_MARKS.PRE_RENDER);

    const { core, plugins } = getStartDeps();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      performanceTracker.mark(PERFORMANCE_TRACKER_MARKS.RENDER_COMPLETE);

      let type: string;

      switch (config.args.shape) {
        case GaugeShapes.HORIZONTAL_BULLET:
          type = `${EXPRESSION_GAUGE_NAME}_horizontal`;
          break;
        case GaugeShapes.VERTICAL_BULLET:
          type = `${EXPRESSION_GAUGE_NAME}_vertical`;
          break;
        case GaugeShapes.SEMI_CIRCLE:
          type = `${EXPRESSION_GAUGE_NAME}_semi_circle`;
          break;
        case GaugeShapes.ARC:
          type = `${EXPRESSION_GAUGE_NAME}_arc`;
          break;
        case GaugeShapes.CIRCLE:
          type = `${EXPRESSION_GAUGE_NAME}_circle`;
          break;
        default:
          type = EXPRESSION_GAUGE_NAME;
      }

      const executionContext = handlers.getExecutionContext();
      const containerType = extractContainerType(executionContext);
      const visualizationType = extractVisualizationType(executionContext);

      if (containerType && visualizationType) {
        const events = [
          `render_${visualizationType}_${type}`,
          config.canNavigateToLens ? `render_${visualizationType}_${type}_convertable` : undefined,
        ].filter<string>((event): event is string => Boolean(event));
        plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, events);
      }

      handlers.done();
    };

    const setChartSize = (chartSizeSpec: ChartSizeEvent['data']) => {
      const event: ChartSizeEvent = {
        name: 'chartSize',
        data: chartSizeSpec,
      };

      handlers.event(event);
    };

    const { GaugeComponent } = await import('../components/gauge_component');

    performanceTracker.mark(PERFORMANCE_TRACKER_MARKS.RENDER_START);

    render(
      <KibanaRenderContextProvider {...core}>
        <div
          className="eui-scrollBar"
          data-test-subj="gaugeChart"
          css={css`
            height: 100%;
            width: 100%;
            // the FocusTrap is adding extra divs which are making the visualization redraw twice
            // with a visible glitch. This make the chart library resilient to this extra reflow
            overflow: hidden;
            user-select: text;
          `}
        >
          <GaugeComponent
            {...config}
            setChartSize={setChartSize}
            formatFactory={getFormatService().deserialize}
            chartsThemeService={plugins.charts.theme}
            paletteService={getPaletteService()}
            renderComplete={renderComplete}
            uiState={handlers.uiState as PersistedState}
          />
        </div>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
