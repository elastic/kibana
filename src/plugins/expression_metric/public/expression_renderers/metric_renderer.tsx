/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { CSSProperties } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';

import { CoreSetup, CoreTheme } from '@kbn/core/public';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { defaultTheme$ } from '@kbn/presentation-util-plugin/common';
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
      const { MetricComponent } = await import('../components/metric_component');
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider theme={{ theme$ }}>
              <MetricComponent
                label={config.label}
                labelFont={config.labelFont ? (config.labelFont.spec as CSSProperties) : {}}
                metric={config.metric}
                metricFont={config.metricFont ? (config.metricFont.spec as CSSProperties) : {}}
                metricFormat={config.metricFormat}
              />
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode,
        () => handlers.done()
      );
    },
  });

export const metricRendererFactory = (core: CoreSetup) => getMetricRenderer(core.theme.theme$);
