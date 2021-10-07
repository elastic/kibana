/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';

import type { Datatable, ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { buildExpressionFunction } from '../../../../../../plugins/expressions/common';

import { IndexPatternExpressionType } from '../../../../../data_views/common/expressions';
import { IndexPatternsContract } from '../../..';

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
  },
});

/** @internal */
export { handleRequest as handleEsaggsRequest };
