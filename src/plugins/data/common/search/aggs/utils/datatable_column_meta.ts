/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
