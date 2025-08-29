/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensApiState } from '../../schema';
import type { LensAttributes, BuildDependencies } from '../../types';
import { buildAdHocReferences, buildReferences } from './references';

export function fromMetricLensStateToApi(
  config: Extract<LensApiState, { type: 'metric' }>
): LensAttributes {
  return {
    title: config.title ?? '',
    visualizationType: 'lnsMetric',
    references: buildReferences(config),
    state: {
      datasourceStates: {},
      internalReferences: [],
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      adHocDataViews: buildAdHocReferences(config),
    },
  };
}

function buildVisualizationState(config: Extract<LensApiState, { type: 'metric' }>) {
  return {};
}

export function fromMetricLensStateToAPI(
  config: LensAttributes,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Extract<LensApiState, { type: 'metric' }> {
  return {
    type: 'metric',
    dataset: {
      type: 'dataView',
      name: '',
    },
    metric: {
      operation: 'count',
    },
  } as Extract<LensApiState, { type: 'metric' }>;
}
