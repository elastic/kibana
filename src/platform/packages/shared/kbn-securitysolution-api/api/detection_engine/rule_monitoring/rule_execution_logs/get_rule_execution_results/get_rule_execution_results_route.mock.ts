/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ruleExecutionResultMock } from '../../model/execution_result.mock';
import type { GetRuleExecutionResultsResponse } from './get_rule_execution_results_route.gen';

const getSomeResponse = (): GetRuleExecutionResultsResponse => {
  const results = ruleExecutionResultMock.getSomeResults();
  return {
    events: results,
    total: results.length,
  };
};

export const getRuleExecutionResultsResponseMock = {
  getSomeResponse,
};
