/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { CSSProperties, lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '../../../presentation_util/public';
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
const MetricComponent = withSuspense(LazyMetricComponent, null);

export const metricRenderer = (): ExpressionRenderDefinition<MetricRendererConfig> => ({
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
      <MetricComponent
        label={config.label}
        labelFont={config.labelFont ? (config.labelFont.spec as CSSProperties) : {}}
        metric={config.metric}
        metricFont={config.metricFont ? (config.metricFont.spec as CSSProperties) : {}}
        metricFormat={config.metricFormat}
      />,
      domNode,
      () => handlers.done()
    );
  },
});
