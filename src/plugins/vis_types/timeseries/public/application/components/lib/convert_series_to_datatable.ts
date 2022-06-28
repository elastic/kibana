/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/public';
import { DatatableRow, DatatableColumn, DatatableColumnType } from '@kbn/expressions-plugin/public';
import type { Query } from '@kbn/es-query';
import { BUCKET_TYPES as DATA_PLUGIN_BUCKET_TYPES, MultiFieldKey } from '@kbn/data-plugin/common';
import { TimeseriesVisParams } from '../../../types';
import type { PanelData, Metric } from '../../../../common/types';
import { getMultiFieldLabel, getFieldsForTerms } from '../../../../common/fields_utils';
import { BUCKET_TYPES, TSVB_METRIC_TYPES } from '../../../../common/enums';
import { fetchIndexPattern } from '../../../../common/index_patterns_utils';
import { getDataStart, getDataViewsStart } from '../../../services';
import { X_ACCESSOR_INDEX } from '../../visualizations/constants';
import type { TSVBTables } from './types';

interface FilterParams {
  filter?: Query;
  label?: string;
  field?: string;
}

interface TSVBColumns {
  id: number;
  name: string;
  fields?: string[];
  isMetric: boolean;
  type: string;
  params?: FilterParams[];
}

export const addMetaToColumns = (
  columns: TSVBColumns[],
  indexPattern: DataView
): DatatableColumn[] => {
  return columns.map((column) => {
    const field = indexPattern.getFieldByName(column.name);
    const type = (field?.spec.type as DatatableColumnType) || 'number';

    let params: unknown = {
      field: field?.spec.name,
    };
    if (column.type === DATA_PLUGIN_BUCKET_TYPES.MULTI_TERMS) {
      params = {
        fields: column.fields,
        otherBucket: true,
      };
    } else if (column.type === BUCKET_TYPES.FILTERS && column.params) {
      const filters = column.params.map((col) => ({
        input: col.filter,
        label: col.label,
      }));
      params = {
        filters,
      };
    } else if (column.type === 'date_histogram') {
      const { query } = getDataStart();
      const timeRange = query.timefilter.timefilter.getTime();
      params = {
        timeRange,
      };
    }

    const cleanedColumn = {
      id: column.id.toString(),
      name: column.name,
      meta: {
        type,
        field: field?.spec.name,
        index: indexPattern.title,
        source: 'esaggs',
        sourceParams: {
          enabled: true,
          indexPatternId: indexPattern?.id,
          type: column.type,
          schema: column.isMetric ? 'metric' : 'group',
          params,
        },
      },
    } as DatatableColumn;
    return cleanedColumn;
  });
};

const hasSeriesAgg = (metrics: Metric[]) => {
  return metrics.some((metric) => metric.type === TSVB_METRIC_TYPES.SERIES_AGG);
};

export const convertSeriesToDataTable = async (
  model: TimeseriesVisParams,
  series: PanelData[],
  initialIndexPattern: DataView
) => {
  const tables: TSVBTables = {};
  const dataViews = getDataViewsStart();
  for (let layerIdx = 0; layerIdx < model.series.length; layerIdx++) {
    const layer = model.series[layerIdx];
    let usedIndexPattern = initialIndexPattern;
    // The user can overwrite the index pattern of a layer.
    // In that case, the index pattern should be fetched again.
    if (layer.override_index_pattern) {
      const { indexPattern } = await fetchIndexPattern(layer.series_index_pattern, dataViews);
      if (indexPattern) {
        usedIndexPattern = indexPattern;
      }
    }
    // series aggregation is a special case, splitting by terms doesn't create multiple series per term
    const isGroupedByTerms =
      layer.split_mode === BUCKET_TYPES.TERMS && !hasSeriesAgg(layer.metrics);
    const isGroupedByFilters = layer.split_mode === BUCKET_TYPES.FILTERS;
    const seriesPerLayer = series.filter((s) => s.seriesId === layer.id);
    let id = X_ACCESSOR_INDEX;

    const columns: TSVBColumns[] = [
      {
        id,
        name: usedIndexPattern.timeFieldName || '',
        isMetric: false,
        type: 'date_histogram',
      },
    ];

    if (seriesPerLayer.length) {
      id++;
      const metrics = layer.metrics;
      columns.push({
        id,
        name: metrics[metrics.length - 1].field || seriesPerLayer[0].splitByLabel,
        isMetric: true,
        type: metrics[metrics.length - 1].type,
      });

      // Adds an extra column, if the layer is split by terms or filters aggregation
      if (isGroupedByTerms) {
        const fieldsForTerms = getFieldsForTerms(layer.terms_field);
        id++;
        columns.push({
          id,
          name: getMultiFieldLabel(fieldsForTerms),
          fields: fieldsForTerms,
          isMetric: false,
          type:
            fieldsForTerms.length > 1 ? DATA_PLUGIN_BUCKET_TYPES.MULTI_TERMS : BUCKET_TYPES.TERMS,
        });
      } else if (isGroupedByFilters) {
        id++;
        columns.push({
          id,
          name: BUCKET_TYPES.FILTERS,
          isMetric: false,
          params: layer?.split_filters as FilterParams[],
          type: BUCKET_TYPES.FILTERS,
        });
      }
    }
    const columnsWithMeta = addMetaToColumns(columns, usedIndexPattern);
    const filtersColumn = columns.find((col) => col.type === BUCKET_TYPES.FILTERS);
    let rows: DatatableRow[] = [];
    for (let j = 0; j < seriesPerLayer.length; j++) {
      const { data, label, isSplitByTerms, termsSplitKey } = seriesPerLayer[j];
      const seriesData = data.map((rowData) => {
        let rowId = X_ACCESSOR_INDEX;
        const rowsData = { [rowId++]: rowData[0], [rowId++]: rowData[1] };

        let splitValue;
        if (isGroupedByTerms || filtersColumn) {
          const termsValue = Array.isArray(termsSplitKey)
            ? new MultiFieldKey({ key: termsSplitKey })
            : termsSplitKey;
          splitValue = {
            [rowId]: isSplitByTerms && termsValue !== undefined ? termsValue : [label].flat()[0],
          };
        }

        return splitValue ? { ...rowsData, ...splitValue } : rowsData;
      });
      rows = [...rows, ...seriesData];
    }
    tables[layer.id] = {
      type: 'datatable',
      rows,
      columns: columnsWithMeta,
    };
  }
  return tables;
};
