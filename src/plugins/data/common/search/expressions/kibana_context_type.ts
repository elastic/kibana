/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Filter } from '@kbn/es-query';
import { ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import { Query, TimeRange } from '../../query';
import { DataViewField } from '../..';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ExecutionContextSearch = {
  filters?: Filter[];
  query?: Query | Query[];
  timeRange?: TimeRange;
  disableShardWarnings?: boolean;
};

export type ExpressionValueSearchContext = ExpressionValueBoxed<
  'kibana_context',
  ExecutionContextSearch
>;

export type KibanaQueryOutput = ExpressionValueBoxed<'kibana_query', Query>;
export type KibanaFilter = ExpressionValueBoxed<'kibana_filter', Filter>;
export type KibanaField = ExpressionValueBoxed<'kibana_field', DataViewField>;

// TODO: These two are exported for legacy reasons - remove them eventually.
export type KIBANA_CONTEXT_NAME = 'kibana_context';
export type KibanaContext = ExpressionValueSearchContext;
