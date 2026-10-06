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
import { type AggConfig, type AggsCommonStart } from '../search';
import type { TimeRange } from '../types';
interface DateHistogramMeta {
  interval?: string;
  timeZone?: string;
  timeRange?: TimeRange;
  dropPartials?: boolean;
  domain?: {
    min: number;
    max: number;
  };
}
export declare class DatatableUtilitiesService {
  private aggs;
  private dataViews;
  private fieldFormats;
  constructor(
    aggs: AggsCommonStart,
    dataViews: DataViewsContract,
    fieldFormats: FieldFormatsStartCommon
  );
  clearField(column: DatatableColumn): void;
  clearFieldFormat(column: DatatableColumn): void;
  getAggConfig(column: DatatableColumn): Promise<AggConfig | undefined>;
  /**
   * Returns the used interval, time zone, applied time range and drop-partials flag for a
   * date histogram column. "auto" will get expanded to the actually used interval.
   * Handles both esaggs date_histogram columns and ES|QL date BUCKET columns
   * (esMeta.bucket with a date unit). Returns undefined for any other column.
   */
  getDateHistogramMeta(
    column: DatatableColumn,
    defaults?: Partial<{
      timeZone: string;
    }>
  ): DateHistogramMeta | undefined;
  getColumnTimeRange(column: DatatableColumn): TimeRange | undefined;
  getDataView(column: DatatableColumn): Promise<DataView | undefined>;
  getField(column: DatatableColumn): Promise<DataViewField | undefined>;
  getFieldFormat(column: DatatableColumn): FieldFormat | undefined;
  getInterval(column: DatatableColumn): string | undefined;
  /**
   * Returns the used interval for a numeric histogram column.
   * "auto" will get expanded to the actually used interval.
   * Handles both esaggs histogram columns and ES|QL numeric BUCKET columns
   * (esMeta.bucket without a date unit). Returns undefined for any other column.
   */
  getNumberHistogramInterval(column: DatatableColumn): number | undefined;
  getTotalCount(table: Datatable): number | undefined;
  hasPrecisionError(column: DatatableColumn): import('@kbn/utility-types').Serializable;
  isFilterable(column: DatatableColumn): boolean;
  setFieldFormat(column: DatatableColumn, fieldFormat: FieldFormat): void;
}
export {};
