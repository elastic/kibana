/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, ExecutionContextSearch } from '@kbn/es-query';
import { ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import { Query } from '../../query';
import { DataViewField } from '../..';

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
