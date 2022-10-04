/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseTimeShift } from '@kbn/data-plugin/common';
import {
  getIndexPatternIds,
  isAnnotationsLayer,
  Layer,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import uuid from 'uuid';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Panel } from '../../../common/types';
import { PANEL_TYPES } from '../../../common/enums';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getMetricsColumns, getBucketsColumns } from '../lib/series';
import {
  getConfigurationForTimeseries as getConfiguration,
  getLayers,
} from '../lib/configurations/xy';
import {
  Layer as ExtendedLayer,
  convertToDateHistogramColumn,
  excludeMetaFromColumn,
} from '../lib/convert';
import { isValidMetrics } from '../lib/metrics';
import { ConvertTsvbToLensVisualization } from '../types';

const excludeMetaFromLayers = (layers: Record<string, ExtendedLayer>): Record<string, Layer> => {
  const newLayers: Record<string, Layer> = {};
  Object.entries(layers).forEach(([layerId, layer]) => {
    const columns = layer.columns.map(excludeMetaFromColumn);
    newLayers[layerId] = { ...layer, columns };
  });

  return newLayers;
};

export const convertToLens: ConvertTsvbToLensVisualization = async (model: Panel) => {
  const dataViews: DataViewsPublicPluginStart = getDataViewsStart();
  const extendedLayers: Record<number, ExtendedLayer> = {};
  const seriesNum = model.series.filter((series) => !series.hidden).length;

  // handle multiple layers/series
  for (const [layerIdx, series] of model.series.entries()) {
    if (series.hidden) {
      continue;
    }

    // not valid time shift
    if (series.offset_time && parseTimeShift(series.offset_time) === 'invalid') {
      return null;
    }

    if (!isValidMetrics(series.metrics, PANEL_TYPES.TIMESERIES)) {
      return null;
    }

    const datasourceInfo = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(series.override_index_pattern),
      series.series_index_pattern,
      series.series_time_field,
      dataViews
    );
    if (!datasourceInfo) {
      return null;
    }

    const { indexPatternId, indexPattern, timeField } = datasourceInfo;
    if (!timeField) {
      return null;
    }

    const dateHistogramColumn = convertToDateHistogramColumn(model, series, indexPattern!, {
      fieldName: timeField,
      isSplit: false,
    });
    if (dateHistogramColumn === null) {
      return null;
    }
    // handle multiple metrics
    const metricsColumns = getMetricsColumns(series, indexPattern!, seriesNum, {
      isStaticValueColumnSupported: true,
    });
    if (metricsColumns === null) {
      return null;
    }

    const bucketsColumns = getBucketsColumns(model, series, metricsColumns, indexPattern!, true);
    if (bucketsColumns === null) {
      return null;
    }

    const isReferenceLine =
      metricsColumns.length === 1 && metricsColumns[0].operationType === 'static_value';

    // only static value without split is supported
    if (isReferenceLine && bucketsColumns.length) {
      return null;
    }

    const layerId = uuid();
    extendedLayers[layerIdx] = {
      indexPatternId,
      layerId,
      columns: isReferenceLine
        ? [...metricsColumns]
        : [...metricsColumns, dateHistogramColumn, ...bucketsColumns],
      columnOrder: [],
    };
  }

  const configLayers = await getLayers(extendedLayers, model, dataViews);
  if (configLayers === null) {
    return null;
  }

  const configuration = getConfiguration(model, configLayers);
  const layers = Object.values(excludeMetaFromLayers(extendedLayers));
  const annotationIndexPatterns = configuration.layers.reduce<string[]>((acc, layer) => {
    if (isAnnotationsLayer(layer)) {
      return [...acc, layer.indexPatternId];
    }
    return acc;
  }, []);

  return {
    type: 'lnsXY',
    layers,
    configuration,
    indexPatternIds: [...getIndexPatternIds(layers), ...annotationIndexPatterns],
  };
};
