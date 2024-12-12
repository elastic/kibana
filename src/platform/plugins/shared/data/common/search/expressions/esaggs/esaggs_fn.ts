/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { buildExpressionFunction } from '@kbn/expressions-plugin/common';

import { IndexPatternExpressionType } from '@kbn/data-views-plugin/common/expressions';
import { DataViewsContract } from '@kbn/data-views-plugin/common';

import { AggsStart, AggExpressionType, aggCountFnName } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';

import { KibanaContext } from '../kibana_context_type';
import { handleRequest } from './request_handler';

const name = 'esaggs';

type Input = KibanaContext | null;
type Output = Observable<Datatable>;

interface Arguments {
  index: IndexPatternExpressionType;
  aggs?: AggExpressionType[];
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  timeFields?: string[];
  probability?: number;
  samplerSeed?: number;
  ignoreGlobalFilters?: boolean;
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
  indexPatterns: DataViewsContract;
  searchSource: ISearchStartSearchSource;
  getNow?: () => Date;
}

/** @internal */
export const getEsaggsMeta: () => Omit<EsaggsExpressionFunctionDefinition, 'fn'> = () => ({
  name,
  type: 'datatable',
  inputTypes: ['kibana_context', 'null'],
  allowCache: true,
  help: i18n.translate('data.functions.esaggs.help', {
    defaultMessage: 'Run AggConfig aggregation',
  }),
  args: {
    index: {
      types: ['index_pattern'],
      required: true,
      help: i18n.translate('data.search.functions.esaggs.index.help', {
        defaultMessage: 'Data view retrieved with indexPatternLoad',
      }),
    },
    aggs: {
      types: ['agg_type'],
      multi: true,
      default: `{${buildExpressionFunction(aggCountFnName, {}).toString()}}`,
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
    probability: {
      types: ['number'],
      default: 1,
      help: i18n.translate('data.search.functions.esaggs.probability.help', {
        defaultMessage:
          'The probability that a document will be included in the aggregated data. Uses random sampler.',
      }),
    },
    samplerSeed: {
      types: ['number'],
      help: i18n.translate('data.search.functions.esaggs.samplerSeed.help', {
        defaultMessage:
          'The seed to generate the random sampling of documents. Uses random sampler.',
      }),
    },
    ignoreGlobalFilters: {
      types: ['boolean'],
      help: i18n.translate('data.search.functions.esaggs.ignoreGlobalFilters.help', {
        defaultMessage: 'Whether to ignore or use global query and filters',
      }),
    },
  },
});

export { handleRequest as handleEsaggsRequest };
export type { RequestHandlerParams } from './request_handler';
