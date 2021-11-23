/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Filter } from '@kbn/es-query';
import { ExpressionValueBoxed, ExpressionValueFilter } from 'src/plugins/expressions/common';
import { Query, TimeRange } from '../../query';
import { adaptToExpressionValueFilter, IndexPatternField } from '../..';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ExecutionContextSearch = {
  filters?: Filter[];
  query?: Query | Query[];
  timeRange?: TimeRange;
};

export type ExpressionValueSearchContext = ExpressionValueBoxed<
  'kibana_context',
  ExecutionContextSearch
>;

export type KibanaQueryOutput = ExpressionValueBoxed<'kibana_query', Query>;
export type KibanaFilter = ExpressionValueBoxed<'kibana_filter', Filter>;
export type KibanaField = ExpressionValueBoxed<'kibana_field', IndexPatternField>;

// TODO: These two are exported for legacy reasons - remove them eventually.
export type KIBANA_CONTEXT_NAME = 'kibana_context';
export type KibanaContext = ExpressionValueSearchContext;

export const kibanaContext = {
  name: 'kibana_context',
  from: {
    null: () => {
      return {
        type: 'kibana_context',
      };
    },
  },
  to: {
    null: () => {
      return {
        type: 'null',
      };
    },
    filter: (input: KibanaContext): ExpressionValueFilter => {
      const { filters = [] } = input;
      return {
        type: 'filter',
        filterType: 'filter',
        and: filters.map(adaptToExpressionValueFilter),
      };
    },
  },
};
