/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewsContract, DataViewField } from '@kbn/data-views-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStartCommon, FieldFormat } from '@kbn/field-formats-plugin/common';
import type { AggsCommonStart, AggConfig, CreateAggConfigParams, IAggType } from '../search';

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

  getTotalCount(table: Datatable): number | undefined {
    return table.meta?.statistics?.totalCount;
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
