/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getColumnsFromVis,
  getVisSchemas,
  getPercentageColumnFormulaColumn,
} from '@kbn/visualizations-plugin/public';
import uuid from 'uuid';
import { getDataViewsStart } from '../services';
import { getConfiguration } from './configurations';
import { ConvertTableToLensVisualization } from './types';

export const convertToLens: ConvertTableToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = vis.data.indexPattern?.id
    ? await dataViews.get(vis.data.indexPattern.id)
    : await dataViews.getDefault();

  if (!dataView) {
    return null;
  }

  const result = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      buckets: ['bucket'],
      splits: ['split_row', 'split_column'],
    },
    { dropEmptyRowsInDateHistogram: true }
  );

  if (result === null) {
    return null;
  }

  if (vis.params.percentageCol) {
    const visSchemas = getVisSchemas(vis, {
      timefilter,
      timeRange: timefilter.getAbsoluteTime(),
    });
    const metricAgg = visSchemas.metric.find((m) => m.label === vis.params.percentageCol);
    if (!metricAgg) {
      return null;
    }
    const percentageColumn = getPercentageColumnFormulaColumn(metricAgg);
    if (!percentageColumn) {
      return null;
    }
    result.columns.push(percentageColumn);
  }

  const layerId = uuid();

  return {
    type: 'lnsDatatable',
    layers: [
      {
        indexPatternId: dataView.id!,
        layerId,
        columns: result.columns,
        columnOrder: [],
      },
    ],
    configuration: getConfiguration(layerId, vis.params, result),
  };
};
