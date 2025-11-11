/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { XYState } from '../../schema';
import { getSharedChartLensStateToAPI, getSharedChartAPIToLensState } from './utils';
import type { LensAttributes } from '../../types';
import { buildDatasourceStates, buildReferences, getAdhocDataviews } from '../utils';
import { buildVisualizationState } from './xy/chart';
import { buildXYLayer, getValueColumns } from './xy/layers';

type XYLens = Extract<TypedLensSerializedState['attributes'], { visualizationType: 'lnsXY' }>;

export function fromAPItoLensState(config: XYState): XYLens {
  // convert layers and produce references from them
  const { layers, usedDataviews } = buildDatasourceStates(config, buildXYLayer, getValueColumns);

  const visualizationState = buildVisualizationState(config);

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);
  const regularDataViews = Object.fromEntries(
    Object.entries(usedDataviews)
      .filter((v): v is [string, { id: string; type: 'dataView' }] => v[1].type === 'dataView')
      .map(([key, { id }]) => [key, id])
  );
  // @TODO: support annotation references
  const references = regularDataViews.length ? buildReferences(regularDataViews) : [];

  return {
    visualizationType: 'lnsXY',
    ...getSharedChartAPIToLensState(config),
    state: {
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: layers,
      internalReferences,
      visualization: visualizationState,
      adHocDataViews,
    },
    references,
  };
}

export function fromLensStateToAPI(config: LensAttributes): XYState {
  return config as unknown as XYState;
}
