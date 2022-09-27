/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAgentsSocketsStats } from './get_agents_sockets_stats';

export const getAgentsSocketsStatsMock: jest.MockedFunction<typeof getAgentsSocketsStats> =
  jest.fn();

jest.doMock('./get_agents_sockets_stats', () => {
  return {
    getAgentsSocketsStats: getAgentsSocketsStatsMock,
  };
});
