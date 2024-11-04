/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewsContract, DataViewField } from '@kbn/data-views-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStartCommon, FieldFormat } from '@kbn/field-formats-plugin/common';
import type {
  AggsCommonStart,
  AggConfig,
  AggParamsDateHistogram,
  AggParamsHistogram,
  CreateAggConfigParams,
  IAggType,
} from '../search';
import { BUCKET_TYPES } from '../search/aggs/buckets/bucket_agg_types';
import type { TimeRange } from '../types';

interface DateHistogramMeta {
  interval?: string;
  timeZone?: string;
  timeRange?: TimeRange;
}

export class DatatableUtilitiesService {
  constructor(
    private aggs: AggsCommonStart,
    private dataViews: DataViewsContract,
    private fieldFormats: FieldFormatsStartCommon
  ) {
    this.getAggConfig = this.getAggConfig.bind(this);
    this.getDataView = this.getDataView.bind(this);
    this.getField = this.getField.bind(this);
    this.isFilterable = this.isFilterable.bind(this);
  }

  clearField(column: DatatableColumn): void {
    delete column.meta.field;
  }

  clearFieldFormat(column: DatatableColumn): void {
    delete column.meta.params;
  }

  async getAggConfig(column: DatatableColumn): Promise<AggConfig | undefined> {
    const dataView = await this.getDataView(column);

    if (!dataView) {
      return;
    }

    const { aggs } = await this.aggs.createAggConfigs(
      dataView,
      column.meta.sourceParams && [column.meta.sourceParams as CreateAggConfigParams]
    );

    return aggs[0];
  }

  /**
   * Helper function returning the used interval, used time zone and applied time filters for data table column created by the date_histogramm agg type.
   * "auto" will get expanded to the actually used interval.
   * If the column is not a column created by a date_histogram aggregation of the esaggs data source,
   * this function will return undefined.
   */
  getDateHistogramMeta(
    column: DatatableColumn,
    defaults: Partial<{
      timeZone: string;
    }> = {}
  ): DateHistogramMeta | undefined {
    if (column.meta.source !== 'esaggs') {
      return;
    }
    if (column.meta.sourceParams?.type !== BUCKET_TYPES.DATE_HISTOGRAM) {
      return;
    }

    const params = column.meta.sourceParams.params as AggParamsDateHistogram;

    let interval: string | undefined;
    if (params.used_interval && params.used_interval !== 'auto') {
      interval = params.used_interval;
    }

    return {
      interval,
      timeZone: params.used_time_zone || defaults.timeZone,
      timeRange: column.meta.sourceParams.appliedTimeRange as TimeRange | undefined,
    };
  }

  async getDataView(column: DatatableColumn): Promise<DataView | undefined> {
    if (!column.meta.index) {
      return;
    }

    return this.dataViews.get(column.meta.index);
  }

  async getField(column: DatatableColumn): Promise<DataViewField | undefined> {
    if (!column.meta.field) {
      return;
    }

    const dataView = await this.getDataView(column);
    if (!dataView) {
      return;
    }

    return dataView.getFieldByName(column.meta.field);
  }

  getFieldFormat(column: DatatableColumn): FieldFormat | undefined {
    return this.fieldFormats.deserialize(column.meta.params);
  }

  getInterval(column: DatatableColumn): string | undefined {
    const params = column.meta.sourceParams?.params as { interval: string } | undefined;

    return params?.interval;
  }

  /**
   * Helper function returning the used interval for data table column created by the histogramm agg type.
   * "auto" will get expanded to the actually used interval.
   * If the column is not a column created by a histogram aggregation of the esaggs data source,
   * this function will return undefined.
   */
  getNumberHistogramInterval(column: DatatableColumn): number | undefined {
    if (column.meta.source !== 'esaggs') {
      return;
    }
    if (column.meta.sourceParams?.type !== BUCKET_TYPES.HISTOGRAM) {
      return;
    }

    const params = column.meta.sourceParams.params as unknown as AggParamsHistogram;

    if (!params.used_interval || typeof params.used_interval === 'string') {
      return;
    }

    return params.used_interval;
  }

  getTotalCount(table: Datatable): number | undefined {
    return table.meta?.statistics?.totalCount;
  }

  hasPrecisionError(column: DatatableColumn) {
    return column.meta.sourceParams?.hasPrecisionError;
  }

  isFilterable(column: DatatableColumn): boolean {
    if (column.meta.source !== 'esaggs') {
      return false;
    }

    const aggType = this.aggs.types.get(column.meta.sourceParams?.type as string) as IAggType;

    return Boolean(aggType.createFilter);
  }

  setFieldFormat(column: DatatableColumn, fieldFormat: FieldFormat): void {
    column.meta.params = fieldFormat.toJSON();
  }
}
