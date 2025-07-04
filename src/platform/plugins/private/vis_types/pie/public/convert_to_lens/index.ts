/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getConvertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { v4 as uuidv4 } from 'uuid';
import { getDataViewsStart } from '../services';
import { getConfiguration } from './configurations';
import { ConvertPieToLensVisualization } from './types';

export const convertToLens: ConvertPieToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis } = await getConvertToLensModule();
  const layers = getColumnsFromVis(vis, timefilter, dataView, {
    buckets: [],
    splits: ['segment'],
    unsupported: ['split_row', 'split_column'],
  });

  if (layers === null) {
    return null;
  }

  const [layerConfig] = layers;

  // doesn't support more than three split slice levels
  // doesn't support pie without at least one split slice
  if (layerConfig.buckets.all.length > 3 || !layerConfig.buckets.all.length) {
    return null;
  }

  const layerId = uuidv4();

  const indexPatternId = dataView.id!;
  return {
    type: 'lnsPie',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: layerConfig.columns.map(excludeMetaFromColumn),
        columnOrder: [],
        ignoreGlobalFilters: false,
      },
    ],
    configuration: getConfiguration(layerId, vis, layerConfig),
    indexPatternIds: [indexPatternId],
  };
};
