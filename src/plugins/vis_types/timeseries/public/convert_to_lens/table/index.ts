/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuid } from 'uuid';
import { parseTimeShift } from '@kbn/data-plugin/common';
import { getIndexPatternIds, Layer } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { PANEL_TYPES } from '../../../common/enums';
import { getDataViewsStart } from '../../services';
import { getColumnState } from '../lib/configurations/table';
import { extractOrGenerateDatasourceInfo } from '../lib/datasource';
import { getMetricsColumns, getBucketsColumns } from '../lib/series';
import { getReducedTimeRange, isValidMetrics } from '../lib/metrics';
import { ConvertTsvbToLensVisualization } from '../types';
import { Layer as ExtendedLayer, excludeMetaFromColumn, Column } from '../lib/convert';

const excludeMetaFromLayers = (layers: Record<string, ExtendedLayer>): Record<string, Layer> => {
  const newLayers: Record<string, Layer> = {};
  Object.entries(layers).forEach(([layerId, layer]) => {
    const columns = layer.columns.map(excludeMetaFromColumn);
    newLayers[layerId] = { ...layer, columns };
  });

  return newLayers;
};

const invalidModelError = () => new Error('Invalid model');

export const convertToLens: ConvertTsvbToLensVisualization = async (
  { params: model, uiState },
  timeRange
) => {
  const columnStates = [];
  const dataViews = getDataViewsStart();

  try {
    const seriesNum = model.series.filter((series) => !series.hidden).length;
    const sortConfig = uiState.get('table')?.sort ?? {};

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      model.index_pattern,
      model.time_field,
      false,
      undefined,
      undefined,
      dataViews
    );

    if (!datasourceInfo) {
      throw invalidModelError();
    }

    const { indexPatternId, indexPattern } = datasourceInfo;

    const commonBucketsColumns = getBucketsColumns(
      undefined,
      {
        split_mode: 'terms',
        terms_field: model.pivot_id,
        terms_size: model.pivot_rows ? model.pivot_rows.toString() : undefined,
      },
      [],
      indexPattern!,
      false,
      model.pivot_label,
      false
    );

    if (!commonBucketsColumns) {
      throw invalidModelError();
    }

    const sortConfiguration = {
      columnId: commonBucketsColumns[0].columnId,
      direction: sortConfig.order,
    };

    columnStates.push(getColumnState(commonBucketsColumns[0].columnId));

    let bucketsColumns: Column[] | null = [];

    if (
      !model.series.every(
        (s) =>
          ((!s.aggregate_by && !model.series[0].aggregate_by) ||
            s.aggregate_by === model.series[0].aggregate_by) &&
          ((!s.aggregate_function && !model.series[0].aggregate_function) ||
            s.aggregate_function === model.series[0].aggregate_function)
      )
    ) {
      throw invalidModelError();
    }

    if (model.series[0].aggregate_by) {
      if (
        !model.series[0].aggregate_function ||
        !['sum', 'mean', 'min', 'max'].includes(model.series[0].aggregate_function)
      ) {
        throw invalidModelError();
      }
      bucketsColumns = getBucketsColumns(
        undefined,
        {
          split_mode: 'terms',
          terms_field: model.series[0].aggregate_by,
        },
        [],
        indexPattern!,
        false
      );
      if (bucketsColumns === null) {
        throw invalidModelError();
      }

      columnStates.push(
        getColumnState(
          bucketsColumns[0].columnId,
          model.series[0].aggregate_function === 'mean' ? 'avg' : model.series[0].aggregate_function
        )
      );
    }

    const metrics = [];

    // handle multiple layers/series
    for (const [_, series] of model.series.entries()) {
      if (series.hidden) {
        continue;
      }

      // not valid time shift
      if (series.offset_time && parseTimeShift(series.offset_time) === 'invalid') {
        throw invalidModelError();
      }

      if (!isValidMetrics(series.metrics, PANEL_TYPES.TABLE, series.time_range_mode)) {
        throw invalidModelError();
      }

      const reducedTimeRange = getReducedTimeRange(model, series, timeRange);

      // handle multiple metrics
      const metricsColumns = getMetricsColumns(series, indexPattern!, seriesNum, {
        reducedTimeRange,
      });
      if (!metricsColumns) {
        throw invalidModelError();
      }

      columnStates.push(getColumnState(metricsColumns[0].columnId, undefined, series));

      if (sortConfig.column === series.id) {
        sortConfiguration.columnId = metricsColumns[0].columnId;
      }

      metrics.push(...metricsColumns);
    }

    if (!metrics.length || metrics.every((metric) => metric.operationType === 'static_value')) {
      throw invalidModelError();
    }

    const extendedLayer: ExtendedLayer = {
      indexPatternId: indexPatternId as string,
      layerId: uuid(),
      columns: [...metrics, ...commonBucketsColumns, ...bucketsColumns],
      columnOrder: [],
    };

    const layers = Object.values(excludeMetaFromLayers({ 0: extendedLayer }));

    return {
      type: 'lnsDatatable',
      layers,
      configuration: {
        columns: columnStates,
        layerId: extendedLayer.layerId,
        layerType: 'data',
        sorting: sortConfiguration,
      },
      indexPatternIds: getIndexPatternIds(layers),
    };
  } catch (e) {
    return null;
  }
};
