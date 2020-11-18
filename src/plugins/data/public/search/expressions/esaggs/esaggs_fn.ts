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

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

import { Datatable, DatatableColumn } from 'src/plugins/expressions/common';
import { Adapters } from 'src/plugins/inspector/common';

import { calculateBounds, EsaggsExpressionFunctionDefinition } from '../../../../common';
import { FormatFactory } from '../../../../common/field_formats/utils';
import { IndexPatternsContract } from '../../../../common/index_patterns/index_patterns';
import { ISearchStartSearchSource, AggsStart } from '../../../../common/search';

import { AddFilters } from './build_tabular_inspector_data';
import { handleRequest } from './request_handler';

const name = 'esaggs';

interface StartDependencies {
  addFilters: AddFilters;
  aggs: AggsStart;
  deserializeFieldFormat: FormatFactory;
  indexPatterns: IndexPatternsContract;
  searchSource: ISearchStartSearchSource;
}

export function getEsaggs({
  getStartDependencies,
}: {
  getStartDependencies: () => Promise<StartDependencies>;
}) {
  return (): EsaggsExpressionFunctionDefinition => ({
    name,
    type: 'datatable',
    inputTypes: ['kibana_context', 'null'],
    help: i18n.translate('data.functions.esaggs.help', {
      defaultMessage: 'Run AggConfig aggregation',
    }),
    args: {
      index: {
        types: ['string'],
        help: '',
      },
      metricsAtAllLevels: {
        types: ['boolean'],
        default: false,
        help: '',
      },
      partialRows: {
        types: ['boolean'],
        default: false,
        help: '',
      },
      includeFormatHints: {
        types: ['boolean'],
        default: false,
        help: '',
      },
      aggConfigs: {
        types: ['string'],
        default: '""',
        help: '',
      },
      timeFields: {
        types: ['string'],
        help: '',
        multi: true,
      },
    },
    async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId }) {
      const {
        addFilters,
        aggs,
        deserializeFieldFormat,
        indexPatterns,
        searchSource,
      } = await getStartDependencies();

      const aggConfigsState = JSON.parse(args.aggConfigs);
      const indexPattern = await indexPatterns.get(args.index);
      const aggConfigs = aggs.createAggConfigs(indexPattern, aggConfigsState);

      const resolvedTimeRange = input?.timeRange && calculateBounds(input.timeRange);

      const response = await handleRequest({
        abortSignal: (abortSignal as unknown) as AbortSignal,
        addFilters,
        aggs: aggConfigs,
        deserializeFieldFormat,
        filters: get(input, 'filters', undefined),
        indexPattern,
        inspectorAdapters: inspectorAdapters as Adapters,
        metricsAtAllLevels: args.metricsAtAllLevels,
        partialRows: args.partialRows,
        query: get(input, 'query', undefined) as any,
        searchSessionId: getSearchSessionId(),
        searchSourceService: searchSource,
        timeFields: args.timeFields,
        timeRange: get(input, 'timeRange', undefined),
      });

      const table: Datatable = {
        type: 'datatable',
        rows: response.rows,
        columns: response.columns.map((column) => {
          const cleanedColumn: DatatableColumn = {
            id: column.id,
            name: column.name,
            meta: {
              type: column.aggConfig.params.field?.type || 'number',
              field: column.aggConfig.params.field?.name,
              index: indexPattern.title,
              params: column.aggConfig.toSerializedFieldFormat(),
              source: name,
              sourceParams: {
                indexPatternId: indexPattern.id,
                appliedTimeRange:
                  column.aggConfig.params.field?.name &&
                  input?.timeRange &&
                  args.timeFields &&
                  args.timeFields.includes(column.aggConfig.params.field?.name)
                    ? {
                        from: resolvedTimeRange?.min?.toISOString(),
                        to: resolvedTimeRange?.max?.toISOString(),
                      }
                    : undefined,
                ...column.aggConfig.serialize(),
              },
            },
          };
          return cleanedColumn;
        }),
      };

      return table;
    },
  });
}
