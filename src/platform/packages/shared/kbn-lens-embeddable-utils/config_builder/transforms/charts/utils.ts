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
  TextBasedLayer,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';
import type { LensApiState } from '../../schema';
import { isTextBasedLayer } from '../utils';

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

export function getDatasourceLayers(
  state: LensAttributes['state']
): Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer> {
  const formBasedLayers = state.datasourceStates.formBased?.layers;
  const textBasedLayers = state.datasourceStates.textBased?.layers;
  // @ts-expect-error unfortunately due to a migration bug, some existing SO might still have the old indexpattern DS state
  const indexPatternLayers = state.datasourceStates.indexpattern?.layers;
  // Charts can have mixed layer types, so collect them all together
  return {
    ...(formBasedLayers && Object.keys(formBasedLayers).length ? formBasedLayers : {}),
    ...(textBasedLayers && Object.keys(textBasedLayers).length ? textBasedLayers : {}),
    ...(indexPatternLayers && Object.keys(indexPatternLayers).length ? indexPatternLayers : {}),
  };
}

export function getLensStateLayer(
  layers: Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer>,
  visLayerId: string | undefined
) {
  // Filter to keep non-linked layers (layers without linkToLayers or with linkToLayers set to null)
  // Also keep ES|QL layers with non-empty columns, as old layers persist after chart type switches and have empty columns
  const mainLayers = Object.entries(layers).filter(
    ([, l]) =>
      !('linkToLayers' in l) ||
      l.linkToLayers == null ||
      (isTextBasedLayer(l) && l.columns.length > 0)
  );

  const visLayer = visLayerId ? mainLayers.find(([id, l]) => id === visLayerId) : undefined;

  return visLayer ?? mainLayers[0];
}
