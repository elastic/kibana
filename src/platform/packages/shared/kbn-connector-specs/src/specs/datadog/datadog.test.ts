/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { DatadogConnector, getSite } from './datadog';
import { DATADOG_SITES } from './types';

describe('DatadogConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
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

  it('exposes monitor actions only (no webhook CRUD)', () => {
    expect(Object.keys(DatadogConnector.actions).sort()).toEqual([
      'getMonitor',
      'listMonitors',
      'muteMonitor',
      'unmuteMonitor',
    ]);
  });

  describe('getSite', () => {
    it('defaults to datadoghq.com when unset or unknown', () => {
      expect(getSite({ ...mockContext, config: {} })).toBe('datadoghq.com');
      expect(getSite({ ...mockContext, config: { site: 'app.datadoghq.com' } })).toBe(
        'datadoghq.com'
      );
    });

    it('accepts every known Datadog site', () => {
      for (const site of DATADOG_SITES) {
        expect(getSite({ ...mockContext, config: { site } })).toBe(site);
      }
    });
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

  it('uses api.<site> for non-US1 sites', async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    const euCtx = {
      ...mockContext,
      config: { site: 'datadoghq.eu' },
    } as unknown as ActionContext;

    await DatadogConnector.test!.handler(euCtx);

    expect(mockClient.get).toHaveBeenCalledWith(
      'https://api.datadoghq.eu/api/v1/monitor',
      expect.any(Object)
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

  it('unmuteMonitor posts scope when provided', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 309422658, overall_state: 'OK' },
    });

    const result = await DatadogConnector.actions.unmuteMonitor.handler(mockContext, {
      monitorId: 309422658,
      scope: 'host:web01',
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/monitor/309422658/unmute',
      { scope: 'host:web01' }
    );
    expect(result).toEqual(expect.objectContaining({ id: 309422658, overallState: 'OK' }));
  });

  it('unmuteMonitor posts empty body when scope omitted', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 309422658, overall_state: 'OK' },
    });

    await DatadogConnector.actions.unmuteMonitor.handler(mockContext, {
      monitorId: 309422658,
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/monitor/309422658/unmute',
      {}
    );
  });

  it('getMonitor fetches with downtimes', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        id: 42,
        name: 'CPU high',
        type: 'metric alert',
        query: 'avg(last_5m):avg:system.cpu.user{*} > 80',
        overall_state: 'Alert',
        tags: ['env:demo'],
        matching_downtimes: [],
      },
    });

    const result = await DatadogConnector.actions.getMonitor.handler(mockContext, {
      monitorId: 42,
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      'https://api.datadoghq.com/api/v1/monitor/42',
      expect.objectContaining({ params: { with_downtimes: true } })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 42,
        name: 'CPU high',
        overallState: 'Alert',
        matchingDowntimes: [],
      })
    );
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
