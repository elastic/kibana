/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { CSSProperties, lazy } from 'react';
import { Observable } from 'rxjs';
import { CoreTheme } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '../../../../core/public';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { withSuspense, defaultTheme$ } from '../../../presentation_util/public';
import { MetricRendererConfig } from '../../common/types';

const strings = {
  getDisplayName: () =>
    i18n.translate('expressionMetric.renderer.metric.displayName', {
      defaultMessage: 'Metric',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionMetric.renderer.metric.helpDescription', {
      defaultMessage: 'Render a number over a label',
    }),
};

const LazyMetricComponent = lazy(() => import('../components/metric_component'));
const MetricComponent = withSuspense(LazyMetricComponent);

export const getMetricRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<MetricRendererConfig> => ({
    name: 'metric',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: MetricRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaThemeProvider theme$={theme$}>
          <MetricComponent
            label={config.label}
            labelFont={config.labelFont ? (config.labelFont.spec as CSSProperties) : {}}
            metric={config.metric}
            metricFont={config.metricFont ? (config.metricFont.spec as CSSProperties) : {}}
            metricFormat={config.metricFormat}
          />
        </KibanaThemeProvider>,
        domNode,
        () => handlers.done()
      );
    },
  });

export const metricRendererFactory = (core: CoreSetup) => getMetricRenderer(core.theme.theme$);
