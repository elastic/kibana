/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

import { getAgentsSocketsStats } from './get_agents_sockets_stats';

export const getHttpAgentMock = (overrides: Partial<HttpAgent>) => {
  return Object.assign(new HttpAgent(), overrides);
};

export const getHttpsAgentMock = (overrides: Partial<HttpsAgent>) => {
  return Object.assign(new HttpsAgent(), overrides);
};

export const getAgentsSocketsStatsMock: jest.MockedFunction<typeof getAgentsSocketsStats> =
  jest.fn();

jest.doMock('./get_agents_sockets_stats', () => {
  return {
    getAgentsSocketsStats: getAgentsSocketsStatsMock,
  };
});
