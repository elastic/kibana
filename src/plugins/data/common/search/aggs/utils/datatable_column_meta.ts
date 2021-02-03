/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DatatableColumn } from 'src/plugins/expressions/common';
import { IndexPattern } from '../../../index_patterns';
import { AggConfigs, CreateAggConfigParams } from '../agg_configs';
import { AggTypesRegistryStart } from '../agg_types_registry';
import { IAggType } from '../agg_type';

export interface MetaByColumnDeps {
  getIndexPattern: (id: string) => Promise<IndexPattern>;
  createAggConfigs: (
    indexPattern: IndexPattern,
    configStates?: CreateAggConfigParams[]
  ) => InstanceType<typeof AggConfigs>;
  aggTypesStart: AggTypesRegistryStart;
}

export const getDatatableColumnUtilities = (deps: MetaByColumnDeps) => {
  const { getIndexPattern, createAggConfigs, aggTypesStart } = deps;

  const getIndexPatternFromDatatableColumn = async (column: DatatableColumn) => {
    if (!column.meta.index) return;

    return await getIndexPattern(column.meta.index);
  };

  const getAggConfigFromDatatableColumn = async (column: DatatableColumn) => {
    const indexPattern = await getIndexPatternFromDatatableColumn(column);

    if (!indexPattern) return;

    const aggConfigs = await createAggConfigs(indexPattern, [column.meta.sourceParams as any]);
    return aggConfigs.aggs[0];
  };

  const isFilterableAggDatatableColumn = (column: DatatableColumn) => {
    if (column.meta.source !== 'esaggs') {
      return false;
    }
    const aggType = (aggTypesStart.get(column.meta.sourceParams?.type as string) as any)(
      {}
    ) as IAggType;
    return Boolean(aggType.createFilter);
  };

  return {
    getIndexPattern: getIndexPatternFromDatatableColumn,
    getAggConfig: getAggConfigFromDatatableColumn,
    isFilterable: isFilterableAggDatatableColumn,
  };
};
