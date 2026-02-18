/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ruleExecutionEventMock } from '../../model/execution_event.mock';
import type { GetRuleExecutionEventsResponse } from './get_rule_execution_events_route.gen';

const getSomeResponse = (): GetRuleExecutionEventsResponse => {
  const events = ruleExecutionEventMock.getSomeEvents();
  return {
    events,
    pagination: {
      page: 1,
      per_page: events.length,
      total: events.length * 10,
    },
  };
};

export const getRuleExecutionEventsResponseMock = {
  getSomeResponse,
};
