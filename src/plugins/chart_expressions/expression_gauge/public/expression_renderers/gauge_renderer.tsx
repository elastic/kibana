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
import { PersistedState } from '@kbn/visualizations-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpressionGaugePluginStart } from '../plugin';
import { EXPRESSION_GAUGE_NAME, GaugeExpressionProps, GaugeShapes } from '../../common';
import { getFormatService, getPaletteService } from '../services';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { extractContainerType, extractVisualizationType } from '../../../common';

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
    const { core, plugins } = getStartDeps();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      let type: string;

      switch (config.args.shape) {
        case GaugeShapes.HORIZONTAL_BULLET:
          type = `${EXPRESSION_GAUGE_NAME}_horizontal`;
          break;
        case GaugeShapes.VERTICAL_BULLET:
          type = `${EXPRESSION_GAUGE_NAME}_vertical`;
          break;
        default:
          type = EXPRESSION_GAUGE_NAME;
      }

      const executionContext = handlers.getExecutionContext();
      const containerType = extractContainerType(executionContext);
      const visualizationType = extractVisualizationType(executionContext);

      if (containerType && visualizationType) {
        plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, [
          `render_${visualizationType}_${type}`,
        ]);
      }

      handlers.done();
    };

    const { GaugeComponent } = await import('../components/gauge_component');
    render(
      <KibanaThemeProvider theme$={core.theme.theme$}>
        <div className="gauge-container" data-test-subj="gaugeChart">
          <GaugeComponent
            {...config}
            formatFactory={getFormatService().deserialize}
            chartsThemeService={plugins.charts.theme}
            paletteService={getPaletteService()}
            renderComplete={renderComplete}
            uiState={handlers.uiState as PersistedState}
          />
        </div>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
