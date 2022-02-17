/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewsContract } from 'src/plugins/data_views/common';
import type { DatatableColumn } from 'src/plugins/expressions/common';
import type { AggsCommonStart, AggConfig, CreateAggConfigParams, IAggType } from '../search';

export class DatatableUtilitiesService {
  constructor(private aggs: AggsCommonStart, private dataViews: DataViewsContract) {
    this.getAggConfig = this.getAggConfig.bind(this);
    this.getDataView = this.getDataView.bind(this);
    this.isFilterable = this.isFilterable.bind(this);
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

  isFilterable(column: DatatableColumn): boolean {
    if (column.meta.source !== 'esaggs') {
      return false;
    }

    const aggType = this.aggs.types.get(column.meta.sourceParams?.type as string) as IAggType;

    return Boolean(aggType.createFilter);
  }
}
