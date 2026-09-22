/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormat, FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { Unit } from '@kbn/datemath';
import { isObject } from 'lodash';
import {
  type AggConfig,
  type AggsCommonStart,
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
  domain?: { min: number; max: number };
}

interface HistogramDSLParams {
  used_interval: string | number;
  used_time_zone?: string;
  drop_partials?: boolean;
}

const isHistogramDSLParams = (params: unknown): params is HistogramDSLParams => {
  if (isObject(params) && Object.hasOwn(params, 'used_interval'))
    return (
      typeof (params as HistogramDSLParams).used_interval === 'string' ||
      typeof (params as HistogramDSLParams).used_interval === 'number'
    );
  return false;
};

const ESQL_UNIT_TO_DATEMATH = {
  millisecond: 'ms',
  second: 's',
  minute: 'm',
  hour: 'h',
  day: 'd',
  week: 'w',
  month: 'M',
  year: 'y',
} as const satisfies Record<string, Unit>;
type ESQLUnit = keyof typeof ESQL_UNIT_TO_DATEMATH;

const isESQLUnit = (s: string): s is ESQLUnit => s in ESQL_UNIT_TO_DATEMATH;

interface ESQLBucketMeta {
  interval: number;
  unit?: string;
}

const getEsqlBucket = (column: DatatableColumn): ESQLBucketMeta | undefined => {
  const isESQLBucketMeta = (meta: unknown): meta is ESQLBucketMeta => {
    if (isObject(meta) && Object.hasOwn(meta, 'interval')) {
      return typeof (meta as ESQLBucketMeta).interval === 'number';
    }
    return false;
  };

  const bucket = column.meta.esMeta?.bucket;

  if (isESQLBucketMeta(bucket)) {
    return bucket;
  }
};

// Convert the raw ES|QL bucket into a datemath interval string, e.g. 30 + "minute" -> "30m"
const formatEsqlBucketAsDateMathInterval = (bucket: ESQLBucketMeta): string => {
  const unitDateMath =
    bucket.unit && isESQLUnit(bucket.unit) ? ESQL_UNIT_TO_DATEMATH[bucket.unit] : undefined;
  return unitDateMath ? `${bucket.interval}${unitDateMath}` : `${bucket.interval}`;
};

const getDropPartials = (params: unknown): boolean | undefined => {
  if (typeof params === 'object' && params !== null && 'drop_partials' in params) {
    return Boolean(params.drop_partials);
  }
  return undefined;
};

const isDomain = (value: unknown): value is { min: number; max: number } =>
  typeof value === 'object' && value !== null && 'min' in value && 'max' in value;

const getDomain = (column: DatatableColumn): { min: number; max: number } | undefined => {
  const computedDomain = column.meta.sourceParams?.computedDomain;
  return isDomain(computedDomain) ? computedDomain : undefined;
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
   * Returns the used interval, time zone, applied time range and drop-partials flag for a
   * date histogram column. "auto" will get expanded to the actually used interval.
   * Handles both esaggs date_histogram columns and ES|QL date BUCKET columns
   * (esMeta.bucket with a date unit). Returns undefined for any other column.
   */
  getDateHistogramMeta(
    column: DatatableColumn,
    defaults: Partial<{
      timeZone: string;
    }> = {}
  ): DateHistogramMeta | undefined {
    const params = column.meta.sourceParams?.params;
    const appliedTimeRange = this.getColumnTimeRange(column);
    const dropPartials = getDropPartials(params);

    // ES|QL path: interval comes from the raw esMeta.bucket,
    const bucket = getEsqlBucket(column);
    if (bucket && bucket.unit && isESQLUnit(bucket.unit)) {
      const domain = getDomain(column);
      return {
        interval: formatEsqlBucketAsDateMathInterval(bucket),
        timeZone: defaults.timeZone,
        timeRange: appliedTimeRange,
        dropPartials,
        domain,
      };
    }

    // esaggs path
    if (!params || !isHistogramDSLParams(params) || typeof params.used_interval !== 'string') {
      return;
    }
    return {
      interval: params.used_interval,
      timeZone: params.used_time_zone || defaults.timeZone,
      timeRange: appliedTimeRange,
      dropPartials,
    };
  }

  getColumnTimeRange(column: DatatableColumn): TimeRange | undefined {
    return column.meta.sourceParams?.appliedTimeRange as TimeRange | undefined;
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
   * Returns the used interval for a numeric histogram column.
   * "auto" will get expanded to the actually used interval.
   * Handles both esaggs histogram columns and ES|QL numeric BUCKET columns
   * (esMeta.bucket without a date unit). Returns undefined for any other column.
   */
  getNumberHistogramInterval(column: DatatableColumn): number | undefined {
    // ES|QL path: a numeric bucket has an interval but no date unit.
    const bucket = getEsqlBucket(column);
    if (bucket && (!bucket.unit || !isESQLUnit(bucket.unit))) {
      return bucket.interval;
    }

    // esaggs path
    if (
      column.meta.source === 'esaggs' &&
      column.meta.sourceParams?.type !== BUCKET_TYPES.HISTOGRAM
    ) {
      return;
    }

    const params = column.meta.sourceParams?.params;
    if (!params || !isHistogramDSLParams(params)) {
      return;
    }

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
