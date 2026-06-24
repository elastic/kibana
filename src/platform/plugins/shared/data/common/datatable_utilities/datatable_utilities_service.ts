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
import { isSourceParamsESQL } from '@kbn/expressions-plugin/common';
import type { Unit } from '@kbn/datemath';
import {
  type AggsCommonStart,
  type AggConfig,
  type AggParamsDateHistogram,
  type AggParamsHistogram,
  type CreateAggConfigParams,
  type IAggType,
} from '../search';
import { BUCKET_TYPES } from '../search/aggs/buckets/bucket_agg_types';
import type { TimeRange } from '../types';

interface DateHistogramMeta {
  interval?: string;
  timeZone?: string;
  timeRange?: TimeRange;
  dropPartials?: boolean;
}

const ESQL_UNITS = ['millisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
type ESQLUnit = (typeof ESQL_UNITS)[number];
const isESQLUnit = (s: string): s is ESQLUnit => (ESQL_UNITS as readonly string[]).includes(s);

const ESQL_UNIT_TO_DATEMATH: Record<string, Unit> = {
  millisecond: 'ms',
  second: 's',
  minute: 'm',
  hour: 'h',
  day: 'd',
  week: 'w',
  month: 'M',
  year: 'y',
  // quarter: not supported by datemath / parseInterval
};

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
   * If the column is not a column created by a date_histogram aggregation of the esaggs data source, or if it's not a bucketed ES|QL column,
   * this function will return undefined.
   */
  getDateHistogramMeta(
    column: DatatableColumn,
    defaults: Partial<{
      timeZone: string;
    }> = {}
  ): DateHistogramMeta | undefined {
    if (!column.meta.sourceParams) {
      return;
    }

    if (isSourceParamsESQL(column.meta.sourceParams)) {
      const bucket = column.meta.sourceParams.bucket;
      if (bucket) {
        if (!bucket.unit || !isESQLUnit(bucket.unit)) {
          return;
        }
        return {
          interval: `${bucket.interval}${ESQL_UNIT_TO_DATEMATH[bucket.unit]}`,
          timeZone: defaults.timeZone,
          timeRange: column.meta.sourceParams.appliedTimeRange as TimeRange | undefined,
          dropPartials: column.meta.sourceParams.dropPartials,
        };
      }
    } else if (column.meta.sourceParams.params) {
      const params = column.meta.sourceParams.params as AggParamsDateHistogram;
      if (params.used_interval && params.used_interval !== 'auto') {
        return {
          interval: params.used_interval,
          timeZone: params.used_time_zone || defaults.timeZone,
          timeRange: column.meta.sourceParams.appliedTimeRange as TimeRange | undefined,
          dropPartials: params.drop_partials,
        };
      }
    }
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
   * If the column is not a column created by a histogram aggregation of the esaggs data source, or if it's not a bucketed ES|QL column,
   * this function will return undefined.
   */
  getNumberHistogramInterval(column: DatatableColumn): number | undefined {
    if (column.meta.sourceParams && isSourceParamsESQL(column.meta.sourceParams)) {
      const bucket = column.meta.sourceParams.bucket;
      if (bucket) {
        return bucket.interval;
      }
    }

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
