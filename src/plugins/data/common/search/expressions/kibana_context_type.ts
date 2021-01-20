/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionValueBoxed } from 'src/plugins/expressions/common';
import { Filter } from '../../es_query';
import { Query, TimeRange } from '../../query';

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
  },
};
