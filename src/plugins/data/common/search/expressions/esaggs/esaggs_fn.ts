/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import {
  Datatable,
  DatatableColumn,
  ExpressionFunctionDefinition,
} from 'src/plugins/expressions/common';

import { FormatFactory } from '../../../field_formats/utils';
import { IndexPatternExpressionType } from '../../../index_patterns/expressions';
import { IndexPatternsContract } from '../../../index_patterns/index_patterns';
import { calculateBounds } from '../../../query';

import { AggsStart, AggExpressionType } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';

import { KibanaContext } from '../kibana_context_type';
import { handleRequest, RequestHandlerParams } from './request_handler';

const name = 'esaggs';

type Input = KibanaContext | null;
type Output = Promise<Datatable>;

interface Arguments {
  index: IndexPatternExpressionType;
  aggs?: AggExpressionType[];
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  timeFields?: string[];
}

export type EsaggsExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'esaggs',
  Input,
  Arguments,
  Output
>;

/** @internal */
export interface EsaggsStartDependencies {
  aggs: AggsStart;
  deserializeFieldFormat: FormatFactory;
  indexPatterns: IndexPatternsContract;
  searchSource: ISearchStartSearchSource;
  getNow?: () => Date;
}

/** @internal */
export const getEsaggsMeta: () => Omit<EsaggsExpressionFunctionDefinition, 'fn'> = () => ({
  name,
  type: 'datatable',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('data.functions.esaggs.help', {
    defaultMessage: 'Run AggConfig aggregation',
  }),
  args: {
    index: {
      types: ['index_pattern'],
      required: true,
      help: i18n.translate('data.search.functions.esaggs.index.help', {
        defaultMessage: 'Index pattern retrieved with indexPatternLoad',
      }),
    },
    aggs: {
      types: ['agg_type'],
      multi: true,
      default: [],
      help: i18n.translate('data.search.functions.esaggs.aggConfigs.help', {
        defaultMessage: 'List of aggs configured with agg_type functions',
      }),
    },
    metricsAtAllLevels: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.esaggs.metricsAtAllLevels.help', {
        defaultMessage: 'Whether to include columns with metrics for each bucket level',
      }),
    },
    partialRows: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.esaggs.partialRows.help', {
        defaultMessage: 'Whether to return rows that only contain partial data',
      }),
    },
    timeFields: {
      types: ['string'],
      multi: true,
      help: i18n.translate('data.search.functions.esaggs.timeFields.help', {
        defaultMessage: 'Provide time fields to get the resolved time ranges for the query',
      }),
    },
  },
});

/** @internal */
export async function handleEsaggsRequest(
  input: Input,
  args: Arguments,
  params: RequestHandlerParams
): Promise<Datatable> {
  const resolvedTimeRange =
    input?.timeRange && calculateBounds(input.timeRange, { forceNow: params.getNow?.() });

  const response = await handleRequest(params);

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
          index: params.indexPattern?.title,
          params: column.aggConfig.toSerializedFieldFormat(),
          source: name,
          sourceParams: {
            indexPatternId: params.indexPattern?.id,
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
}
