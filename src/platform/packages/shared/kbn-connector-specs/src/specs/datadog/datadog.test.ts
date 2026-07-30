/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { DatadogConnector } from './datadog';
import { DATADOG_WEBHOOK_PAYLOAD_TEMPLATE } from './types';

describe('DatadogConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: {},
    config: { site: 'datadoghq.com' },
    secrets: {
      authType: 'bearer',
      token: 'ddsat_test-token',
    },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', async () => {
    const { getConnectorSpec } = await import('../../get_connector_spec');
    expect(getConnectorSpec('.datadog')).toBeDefined();
    expect(getConnectorSpec('.datadog')?.metadata.id).toBe('.datadog');
  });

  it('uses bearer auth (not basic / dual-header)', () => {
    const types = DatadogConnector.auth?.types?.map((t) => t.type) ?? [];
    expect(types).toEqual(['bearer']);
    expect(types).not.toContain('basic');
    expect(types).not.toContain('api_key_header');
  });

  it('test probes monitors with page_size 1', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [{ id: 1, name: 'm' }],
    });

    const result = await DatadogConnector.test!.handler(mockContext);

    expect(mockClient.get).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/monitor',
      expect.objectContaining({ params: { page_size: 1 } })
    );
    expect(result).toEqual(expect.objectContaining({ ok: true, site: 'datadoghq.com' }));
  });

  it('registerWebhook posts payload template', async () => {
    mockClient.post.mockResolvedValue({
      data: { name: 'kibana-test', url: 'https://example.com/hook' },
    });

    const result = await DatadogConnector.actions.registerWebhook.handler(mockContext, {
      name: 'kibana-test',
      url: 'https://example.com/hook',
      customAuthHeader: 'secret-token',
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/integration/webhooks/configuration/webhooks',
      {
        name: 'kibana-test',
        url: 'https://example.com/hook',
        payload: DATADOG_WEBHOOK_PAYLOAD_TEMPLATE,
        custom_headers: JSON.stringify({ Authorization: 'Bearer secret-token' }),
      }
    );
    expect(result).toEqual(
      expect.objectContaining({ name: 'kibana-test', url: 'https://example.com/hook' })
    );
  });

  it('muteMonitor posts to mute endpoint', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 309422658, overall_state: 'Alert' },
    });

    const result = await DatadogConnector.actions.muteMonitor.handler(mockContext, {
      monitorId: 309422658,
      scope: 'host:web01',
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/monitor/309422658/mute',
      { scope: 'host:web01' }
    );
    expect(result).toEqual(expect.objectContaining({ id: 309422658, overallState: 'Alert' }));
  });

  it('listMonitors maps monitor summaries', async () => {
    mockClient.get.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Payment Service Error Rate',
          overall_state: 'Alert',
          tags: ['env:demo'],
          type: 'metric alert',
        },
      ],
    });

    const result = await DatadogConnector.actions.listMonitors.handler(mockContext, {
      tags: 'env:demo',
      groupStates: 'alert',
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/monitor',
      expect.objectContaining({
        params: expect.objectContaining({
          tags: 'env:demo',
          group_states: 'alert',
          page: 0,
          page_size: 100,
        }),
      })
    );
    expect(result).toEqual({
      count: 1,
      monitors: [
        {
          id: 1,
          name: 'Payment Service Error Rate',
          overallState: 'Alert',
          tags: ['env:demo'],
          type: 'metric alert',
        },
      ],
    });
  });
});
