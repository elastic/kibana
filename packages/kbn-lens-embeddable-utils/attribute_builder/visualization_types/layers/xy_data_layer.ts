/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormulaPublicApi,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  XYDataLayerConfig as LensXYDataLayerConfig,
  SeriesType,
  TermsIndexPatternColumn,
  DateHistogramIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { ChartColumn, ChartLayer, FormulaValueConfig } from '../../types';
import {
  getDefaultReferences,
  getHistogramColumn,
  getTopValuesColumn,
  nonNullable,
  type TopValuesColumnParams,
  type DateHistogramColumnParams,
} from '../../utils';
import { XY_DATA_ID } from '../constants';
import { FormulaColumn } from './columns/formula';

const BREAKDOWN_COLUMN_NAME = 'aggs_breakdown';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';

interface TopValuesBucketedColumn {
  type: 'top_values';
  field: TermsIndexPatternColumn['sourceField'];
  params?: Partial<TopValuesColumnParams>;
}
interface DateHistogramBucketedColumn {
  type: 'date_histogram';
  field?: DateHistogramIndexPatternColumn['sourceField'];
  params?: Partial<DateHistogramColumnParams>;
}

export interface XYLayerOptions {
  // Add more types as support for them is implemented
  breakdown?: TopValuesBucketedColumn;
  // Add more types as support for them is implemented
  buckets?: DateHistogramBucketedColumn;
  seriesType?: SeriesType;
}

export interface XYDataLayerConfig {
  data: FormulaValueConfig[];
  options?: XYLayerOptions;
  layerType?: typeof XY_DATA_ID;

  /**
   * It is possible to define a specific dataView for the layer. It will override the global chart one
   **/
  dataView?: DataView;
}

export class XYDataLayer implements ChartLayer<LensXYDataLayerConfig> {
  private column: ChartColumn[];
  private layerConfig: XYDataLayerConfig;
  constructor(layerConfig: XYDataLayerConfig) {
    this.column = layerConfig.data.map((dataItem) => new FormulaColumn(dataItem));
    this.layerConfig = {
      ...layerConfig,
      layerType: layerConfig.layerType ?? 'data',
      options: {
        ...layerConfig.options,
        buckets: {
          type: 'date_histogram',
          ...layerConfig.options?.buckets,
        },
      },
    };
  }

  getName(): string | undefined {
    return this.column[0].getValueConfig().label;
  }

  getBaseLayer(dataView: DataView, options: XYLayerOptions) {
    return {
      ...(options.buckets?.type === 'date_histogram'
        ? getHistogramColumn({
            columnName: HISTOGRAM_COLUMN_NAME,
            options: {
              params: {
                ...options.buckets.params,
              },
              sourceField: options.buckets.field ?? dataView.timeFieldName,
            },
          })
        : {}),
      ...(options.breakdown?.type === 'top_values'
        ? {
            ...getTopValuesColumn({
              columnName: BREAKDOWN_COLUMN_NAME,
              field: options?.breakdown.field,
              options: {
                ...options.breakdown.params,
              },
            }),
          }
        : {}),
    };
  }

  getLayer(
    layerId: string,
    accessorId: string,
    chartDataView: DataView,
    formulaAPI: FormulaPublicApi
  ): FormBasedPersistedState['layers'] {
    const columnOrder: string[] = [];
    if (this.layerConfig.options?.breakdown?.type === 'top_values') {
      columnOrder.push(BREAKDOWN_COLUMN_NAME);
    }
    if (this.layerConfig.options?.buckets?.type === 'date_histogram') {
      columnOrder.push(HISTOGRAM_COLUMN_NAME);
    }

    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder,
      columns: {
        ...this.getBaseLayer(
          this.layerConfig.dataView ?? chartDataView,
          this.layerConfig.options ?? {}
        ),
      },
    };

    return {
      [layerId]: this.column.reduce(
        (acc, curr, index) => ({
          ...acc,
          ...curr.getData(
            `${accessorId}_${index}`,
            acc,
            this.layerConfig.dataView ?? chartDataView,
            formulaAPI
          ),
        }),
        baseLayer
      ),
    };
  }

  getReference(layerId: string, chartDataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(this.layerConfig.dataView ?? chartDataView, layerId);
  }

  getLayerConfig(layerId: string, accessorId: string): LensXYDataLayerConfig {
    return {
      layerId,
      seriesType: this.layerConfig.options?.seriesType ?? 'line',
      accessors: this.column.map((_, index) => `${accessorId}_${index}`),
      yConfig: this.layerConfig.data
        .map(({ color }, index) =>
          color ? { forAccessor: `${accessorId}_${index}`, color } : undefined
        )
        .filter(nonNullable),
      layerType: 'data',
      xAccessor:
        this.layerConfig.options?.buckets?.type === 'date_histogram'
          ? HISTOGRAM_COLUMN_NAME
          : undefined,
      splitAccessor:
        this.layerConfig.options?.breakdown?.type === 'top_values'
          ? BREAKDOWN_COLUMN_NAME
          : undefined,
    };
  }

  getDataView(): DataView | undefined {
    return this.layerConfig.dataView;
  }
}
