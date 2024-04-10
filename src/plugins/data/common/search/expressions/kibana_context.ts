/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunctionDefinition, ExecutionContext } from '@kbn/expressions-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { KibanaTimerangeOutput, KibanaContext, KibanaFilter, KibanaQueryOutput } from '../..';

interface Arguments {
  q?: KibanaQueryOutput[] | null;
  filters?: KibanaFilter[] | null;
  timeRange?: KibanaTimerangeOutput | null;
  savedSearchId?: string | null;
}

export type ExpressionFunctionKibanaContext = ExpressionFunctionDefinition<
  'kibana_context',
  KibanaContext | null,
  Arguments,
  Promise<KibanaContext>,
  ExecutionContext<Adapters>
>;
