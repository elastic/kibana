/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getConvertToLensModule,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { NavigateToLensContext, TagcloudVisConfiguration } from '@kbn/visualizations-plugin/common';
import type { TagCloudVisParams } from '../types';
import { getDataViewsStart } from '../services';

export const convertToLens = async (
  vis: Vis<TagCloudVisParams>,
  timefilter?: TimefilterContract
) => {
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
    splits: ['segment'],
  });

  if (layers === null) {
    return null;
  }

  const [layerConfig] = layers;

  if (!layerConfig.buckets.all.length || !layerConfig.metrics.length) {
    return null;
  }

  const layerId = uuidv4();

  const indexPatternId = dataView.id!;
  return {
    type: 'lnsTagcloud',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: layerConfig.columns.map(excludeMetaFromColumn),
        columnOrder: [],
        ignoreGlobalFilters: false,
      },
    ],
    configuration: {
      layerId,
      layerType: 'data',
      valueAccessor: layerConfig.metrics[0],
      tagAccessor: layerConfig.buckets.all[0],
      maxFontSize: vis.params.maxFontSize,
      minFontSize: vis.params.minFontSize,
      orientation: vis.params.orientation,
      palette: vis.params.palette,
      showLabel: vis.params.showLabel,
    },
    indexPatternIds: [indexPatternId],
  } as NavigateToLensContext<TagcloudVisConfiguration>;
};
