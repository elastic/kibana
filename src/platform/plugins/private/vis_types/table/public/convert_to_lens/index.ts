/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '@kbn/visualizations-plugin/common';
import {
  getConvertToLensModule,
  getVisSchemas,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { v4 as uuidv4 } from 'uuid';
import { getDataViewsStart } from '../services';
import { getConfiguration } from './configurations';
import { ConvertTableToLensVisualization } from './types';

export const convertToLens: ConvertTableToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis, getPercentageColumnFormulaColumn } = await getConvertToLensModule();
  const layers = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      buckets: ['bucket'],
      splits: ['split_row', 'split_column'],
    },
    { dropEmptyRowsInDateHistogram: true, isPercentageMode: false }
  );

  if (layers === null) {
    return null;
  }

  const [layerConfig] = layers;

  if (vis.params.percentageCol) {
    const visSchemas = getVisSchemas(vis, {
      timefilter,
      timeRange: timefilter.getAbsoluteTime(),
    });
    const metricAgg = visSchemas.metric.find((m) => m.label === vis.params.percentageCol);
    if (!metricAgg) {
      return null;
    }
    const percentageColumn = getPercentageColumnFormulaColumn({
      visType: vis.type.name,
      agg: metricAgg as SchemaConfig<METRIC_TYPES>,
      dataView,
      aggs: visSchemas.metric as Array<SchemaConfig<METRIC_TYPES>>,
    });
    if (!percentageColumn) {
      return null;
    }
    layerConfig.columns.splice(
      layerConfig.columnsWithoutReferenced.findIndex((c) => c.meta.aggId === metricAgg.aggId) + 1,
      0,
      percentageColumn
    );
    layerConfig.columnsWithoutReferenced.push(percentageColumn);
  }

  const layerId = uuidv4();
  const indexPatternId = dataView.id!;
  return {
    type: 'lnsDatatable',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: layerConfig.columns.map(excludeMetaFromColumn),
        columnOrder: [],
        ignoreGlobalFilters: false,
      },
    ],
    configuration: getConfiguration(layerId, vis.params, layerConfig),
    indexPatternIds: [indexPatternId],
  };
};
