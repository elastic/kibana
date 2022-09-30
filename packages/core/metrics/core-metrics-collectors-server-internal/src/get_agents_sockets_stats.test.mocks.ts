/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

import { getAgentsSocketsStats } from './get_agents_sockets_stats';

export const getHttpAgentMock = (defaults: Partial<HttpAgent>) => {
  jest.doMock('http');
  const agent = new HttpAgent();
  return Object.assign(agent, defaults);
};

export const getHttpsAgentMock = (defaults: Partial<HttpsAgent>) => {
  jest.doMock('https');
  const agent = new HttpsAgent();
  return Object.assign(agent, defaults);
};

export const getAgentsSocketsStatsMock: jest.MockedFunction<typeof getAgentsSocketsStats> =
  jest.fn();

jest.doMock('./get_agents_sockets_stats', () => {
  return {
    getAgentsSocketsStats: getAgentsSocketsStatsMock,
  };
});
