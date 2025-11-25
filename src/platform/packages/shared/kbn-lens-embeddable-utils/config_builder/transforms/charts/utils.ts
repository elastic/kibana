/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { GaugeVisualizationState, MetricVisualizationState } from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

export function getSharedChartLensStateToAPI(
  config: Pick<LensAttributes, 'title' | 'description'>
) {
  return {
    // @TODO: need to make this optional in LensDocument type
    title: config.title ?? '',
    ...(config.description != null ? { description: config.description } : {}),
  };
}

export function getSharedChartAPIToLensState(config: { title?: string; description?: string }) {
  return {
    // @TODO: need to make this optional in LensDocument type
    title: config.title ?? '',
    ...(config.description != null ? { description: config.description } : {}),
  };
}

export function getMetricAccessor(
  visualization: GaugeVisualizationState | MetricVisualizationState
) {
  // @ts-expect-error Unfortunately for some obscure reasons there are SO out there with the accessor property instead of the correct one
  return visualization.metricAccessor ?? visualization.accessor;
}
