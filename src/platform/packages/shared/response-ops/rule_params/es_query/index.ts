/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COMPARATORS } from '@kbn/alerting-comparators';

export { EsQueryRuleParamsSchema } from './latest';
export { EsQueryRuleParamsSchema as EsQueryRuleParamsSchemaV1 } from './v1';

export type { EsQueryRuleParams } from './latest';
export type { EsQueryRuleParams as EsQueryRuleParamsV1 } from './latest';

export const ES_QUERY_DEFAULT_VALUES = {
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  QUERY: `{
    "query":{
      "match_all" : {}
    }
  }`,
  SIZE: 100,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
  AGGREGATION_TYPE: 'count',
  TERM_SIZE: 5,
  GROUP_BY: 'all',
  EXCLUDE_PREVIOUS_HITS: false,
  CAN_SELECT_MULTI_TERMS: true,
};

export const ES_QUERY_SERVERLESS_DEFAULT_VALUES = {
  SIZE: 10,
};
