/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  FormBasedLayer,
  GaugeVisualizationState,
  MetricVisualizationState,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';
import type { LensApiState } from '../../schema';

export function getSharedChartLensStateToAPI(
  config: Pick<LensAttributes, 'title' | 'description'>
): Pick<LensApiState, 'title' | 'description'> {
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

export function getDatasourceLayers(state: LensAttributes['state']) {
  const formBasedLayers = state.datasourceStates.formBased?.layers;
  if (formBasedLayers && Object.keys(formBasedLayers).length) {
    return formBasedLayers;
  }
  const textBasedLayers = state.datasourceStates.textBased?.layers;
  if (textBasedLayers && Object.keys(textBasedLayers).length) {
    return textBasedLayers;
  }
  // @ts-expect-error unfortunately due to a migration bug, some existing SO might still have the old indexpattern DS state
  const indexPatternLayers = state.datasourceStates.indexpattern?.layers;
  if (indexPatternLayers && Object.keys(indexPatternLayers).length) {
    return indexPatternLayers as Record<string, Omit<FormBasedLayer, 'indexPatternId'>>;
  }
  return {};
}
