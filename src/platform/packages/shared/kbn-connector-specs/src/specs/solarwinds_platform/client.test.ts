/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { swisInvoke, swisQuery, swisRead } from './client';

const buildContext = (url: string) => {
  const client = { get: jest.fn(), post: jest.fn() };
  return { client, ctx: { client, config: { url } } as unknown as ActionContext };
};

describe('SolarWinds SWIS client', () => {
  it('builds the SWIS JSON URL from a base URL with trailing slashes', async () => {
    const { client, ctx } = buildContext(' https://orion.example.com:17774// ');
    client.post.mockResolvedValue({ data: { results: [] } });

    await swisQuery(ctx, 'SELECT NodeID FROM Orion.Nodes');

    expect(client.post).toHaveBeenCalledWith(
      'https://orion.example.com:17774/SolarWinds/InformationService/v3/Json/Query',
      { query: 'SELECT NodeID FROM Orion.Nodes', parameters: {} }
    );
  });

  it('names the verb in an invoke error and keeps a plain-text error body', async () => {
    const { client, ctx } = buildContext('https://orion.example.com:17774');
    client.post.mockRejectedValue({
      message: 'Request failed with status code 403',
      response: { status: 403, data: 'Access denied' },
    });

    await expect(swisInvoke(ctx, 'Orion.AlertActive', 'Acknowledge', [[1], ''])).rejects.toThrow(
      'SolarWinds Orion.AlertActive.Acknowledge failed (status 403): Access denied'
    );
  });

  it('reads an object by its SWIS URI on the configured server', async () => {
    const { client, ctx } = buildContext('https://orion.example.com:17774');
    client.get.mockResolvedValue({ data: { Site: 'HQ' } });

    await swisRead(ctx, 'swis://orion/Orion/Orion.Nodes/NodeID=7/CustomProperties');

    expect(client.get).toHaveBeenCalledWith(
      'https://orion.example.com:17774/SolarWinds/InformationService/v3/Json/swis://orion/Orion/Orion.Nodes/NodeID=7/CustomProperties'
    );
  });
});
