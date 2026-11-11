/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { Dynatrace } from './dynatrace';
import {
  DynatraceCreateMaintenanceWindowInputSchema,
  DynatraceIngestEventInputSchema,
} from './types';

describe('Dynatrace', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const authHeaders = { Authorization: 'Api-Token dt0c01.test.token' };

  const mockContext = {
    client: mockClient,
    config: { environmentUrl: 'https://abc123.live.dynatrace.com' },
    secrets: { authType: 'api_key_header', apiToken: 'dt0c01.test.token' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Dynatrace).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.dynatrace');
    expect(spec).toBe(Dynatrace);
    expect(spec?.actions.listProblems).toBeDefined();
    expect(spec?.actions.listProblems.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Dynatrace.metadata.id).toBe('.dynatrace');
    expect(Dynatrace.metadata.displayName).toBe('Dynatrace');
    expect(Dynatrace.metadata.minimumLicense).toBe('enterprise');
    expect(Dynatrace.metadata.supportedFeatureIds).toContain('workflows');
    expect(Dynatrace.metadata.isTechnicalPreview).toBe(true);
  });

  it('should support api_key_header auth storing apiToken', () => {
    const types = (Dynatrace.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('api_key_header');
    const apiKey = (
      Dynatrace.auth?.types as Array<string | { type: string; defaults?: unknown }>
    ).find((t) => typeof t !== 'string' && t.type === 'api_key_header');
    expect(apiKey && typeof apiKey !== 'string' ? apiKey.defaults : undefined).toEqual({
      headerField: 'apiToken',
    });
  });

  describe('environment URL normalization', () => {
    it('rewrites *.apps.dynatrace.com UI hosts to *.live.dynatrace.com for API calls', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [] } });
      const ctx = {
        ...mockContext,
        config: { environmentUrl: 'https://wkf10640.apps.dynatrace.com' },
      } as unknown as ActionContext;
      await Dynatrace.actions.listProblems.handler(ctx, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://wkf10640.live.dynatrace.com/api/v2/problems',
        expect.any(Object)
      );
    });

    it('rewrites *.live.apps.dynatrace.com to *.live.dynatrace.com', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [] } });
      const ctx = {
        ...mockContext,
        config: { environmentUrl: 'https://wkf10640.live.apps.dynatrace.com/' },
      } as unknown as ActionContext;
      await Dynatrace.actions.listProblems.handler(ctx, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://wkf10640.live.dynatrace.com/api/v2/problems',
        expect.any(Object)
      );
    });
  });

  describe('auth header normalization', () => {
    it('prefixes a raw apiToken with Api-Token on requests', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [] } });
      await Dynatrace.actions.listProblems.handler(mockContext, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems',
        expect.objectContaining({
          headers: { Authorization: 'Api-Token dt0c01.test.token' },
        })
      );
    });

    it('preserves an Api-Token prefix already present on the secret', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [] } });
      const ctx = {
        ...mockContext,
        secrets: { authType: 'api_key_header', apiToken: 'Api-Token dt0c01.already.prefixed' },
      } as unknown as ActionContext;
      await Dynatrace.actions.listProblems.handler(ctx, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems',
        expect.objectContaining({
          headers: { Authorization: 'Api-Token dt0c01.already.prefixed' },
        })
      );
    });

    it('preserves a Bearer prefix already present on the secret', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [] } });
      const ctx = {
        ...mockContext,
        secrets: { authType: 'api_key_header', apiToken: 'Bearer platform-token' },
      } as unknown as ActionContext;
      await Dynatrace.actions.listProblems.handler(ctx, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems',
        expect.objectContaining({
          headers: { Authorization: 'Bearer platform-token' },
        })
      );
    });
  });

  it('should keep test.enabled true', () => {
    expect(Dynatrace.test?.enabled).toBe(true);
  });

  describe('config schema', () => {
    it('accepts a valid environmentUrl', () => {
      const schema = Dynatrace.schema;
      if (!schema) {
        throw new Error('expected schema');
      }
      const parsed = schema.parse({
        environmentUrl: 'https://abc123.live.dynatrace.com',
      });
      expect(parsed.environmentUrl).toBe('https://abc123.live.dynatrace.com');
    });

    it('rejects a missing environmentUrl', () => {
      const schema = Dynatrace.schema;
      if (!schema) {
        throw new Error('expected schema');
      }
      expect(() => schema.parse({})).toThrow();
    });
  });

  describe('listProblems', () => {
    it('GETs /problems with filters', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [], totalCount: 0 } });
      const result = await Dynatrace.actions.listProblems.handler(mockContext, {
        problemSelector: 'status("OPEN")',
        pageSize: 10,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems',
        {
          headers: authHeaders,
          params: {
            problemSelector: 'status("OPEN")',
            pageSize: 10,
          },
        }
      );
      expect(result).toEqual({ problems: [], totalCount: 0 });
    });
  });

  describe('getProblem', () => {
    it('encodes problemId in the path', async () => {
      mockClient.get.mockResolvedValue({ data: { problemId: 'p/1' } });
      await Dynatrace.actions.getProblem.handler(mockContext, { problemId: 'p/1' });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems/p%2F1',
        { headers: authHeaders, params: {} }
      );
    });
  });

  describe('closeProblem', () => {
    it('POSTs closing message', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { problemId: 'p1', closing: true },
      });
      const result = await Dynatrace.actions.closeProblem.handler(mockContext, {
        problemId: 'p1',
        message: 'Fixed',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems/p1/close',
        { message: 'Fixed' },
        { headers: authHeaders }
      );
      expect(result).toEqual({ problemId: 'p1', closing: true });
    });

    it('maps HTTP 204 to alreadyClosed', async () => {
      mockClient.post.mockResolvedValue({ status: 204, data: '' });
      const result = await Dynatrace.actions.closeProblem.handler(mockContext, {
        problemId: 'p1',
        message: 'Fixed',
      });
      expect(result).toEqual({ alreadyClosed: true, problemId: 'p1' });
    });
  });

  describe('addProblemComment', () => {
    it('POSTs message and optional context', async () => {
      mockClient.post.mockResolvedValue({ status: 201, data: '' });
      await Dynatrace.actions.addProblemComment.handler(mockContext, {
        problemId: 'p1',
        message: 'Investigating',
        context: 'workflow-run-1',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems/p1/comments',
        { message: 'Investigating', context: 'workflow-run-1' },
        { headers: authHeaders }
      );
    });
  });

  describe('listProblemComments', () => {
    it('GETs comments for a problem', async () => {
      mockClient.get.mockResolvedValue({ data: { comments: [] } });
      await Dynatrace.actions.listProblemComments.handler(mockContext, {
        problemId: 'p1',
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems/p1/comments',
        { headers: authHeaders, params: { pageSize: 20 } }
      );
    });
  });

  describe('ingestEvent', () => {
    it('POSTs to /events/ingest', async () => {
      mockClient.post.mockResolvedValue({
        data: { reportCount: 1, eventIngestResults: [{ status: 'OK' }] },
      });
      await Dynatrace.actions.ingestEvent.handler(mockContext, {
        eventType: 'CUSTOM_DEPLOYMENT',
        title: 'Deploy v1.2',
        entitySelector: 'type(SERVICE),entityName.equals("api")',
        properties: { version: '1.2' },
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/events/ingest',
        {
          eventType: 'CUSTOM_DEPLOYMENT',
          title: 'Deploy v1.2',
          entitySelector: 'type(SERVICE),entityName.equals("api")',
          properties: { version: '1.2' },
        },
        { headers: authHeaders }
      );
    });

    it('rejects more than 50 event properties', () => {
      const props = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, `v${i}`]));
      expect(() =>
        DynatraceIngestEventInputSchema.parse({
          eventType: 'CUSTOM_INFO',
          title: 'too many',
          properties: props,
        })
      ).toThrow();
    });
  });

  describe('listEvents / getEvent', () => {
    it('lists events with filters', async () => {
      mockClient.get.mockResolvedValue({ data: { events: [] } });
      await Dynatrace.actions.listEvents.handler(mockContext, {
        eventSelector: 'eventType("CUSTOM_INFO")',
        from: 'now-1h',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/events',
        {
          headers: authHeaders,
          params: {
            eventSelector: 'eventType("CUSTOM_INFO")',
            from: 'now-1h',
          },
        }
      );
    });

    it('encodes eventId', async () => {
      mockClient.get.mockResolvedValue({ data: { eventId: 'a/b' } });
      await Dynatrace.actions.getEvent.handler(mockContext, { eventId: 'a/b' });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/events/a%2Fb',
        { headers: authHeaders }
      );
    });
  });

  describe('queryMetrics / listMetrics / getMetricDescriptor', () => {
    it('queries metric data points', async () => {
      mockClient.get.mockResolvedValue({ data: { result: [] } });
      await Dynatrace.actions.queryMetrics.handler(mockContext, {
        metricSelector: 'builtin:host.cpu.usage:avg',
        from: 'now-1h',
        resolution: '5m',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/metrics/query',
        {
          headers: authHeaders,
          params: {
            metricSelector: 'builtin:host.cpu.usage:avg',
            from: 'now-1h',
            resolution: '5m',
          },
        }
      );
    });

    it('lists metrics', async () => {
      mockClient.get.mockResolvedValue({ data: { metrics: [] } });
      await Dynatrace.actions.listMetrics.handler(mockContext, {
        metricSelector: 'builtin:host.*',
        fields: 'unit',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/metrics',
        {
          headers: authHeaders,
          params: {
            metricSelector: 'builtin:host.*',
            fields: 'unit',
          },
        }
      );
    });

    it('encodes colons in metricId path segments', async () => {
      mockClient.get.mockResolvedValue({ data: { metricId: 'builtin:host.cpu.usage' } });
      await Dynatrace.actions.getMetricDescriptor.handler(mockContext, {
        metricId: 'builtin:host.cpu.usage',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/metrics/builtin%3Ahost.cpu.usage',
        { headers: authHeaders, params: {} }
      );
    });
  });

  describe('listEntities / getEntity', () => {
    it('lists entities with required selector', async () => {
      mockClient.get.mockResolvedValue({ data: { entities: [] } });
      await Dynatrace.actions.listEntities.handler(mockContext, {
        entitySelector: 'type("HOST")',
        pageSize: 5,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/entities',
        {
          headers: authHeaders,
          params: {
            entitySelector: 'type("HOST")',
            pageSize: 5,
          },
        }
      );
    });

    it('encodes entityId', async () => {
      mockClient.get.mockResolvedValue({ data: { entityId: 'HOST-1' } });
      await Dynatrace.actions.getEntity.handler(mockContext, { entityId: 'HOST/1' });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/entities/HOST%2F1',
        { headers: authHeaders, params: {} }
      );
    });
  });

  describe('maintenance windows', () => {
    it('creates a once-off window via Settings API', async () => {
      mockClient.post.mockResolvedValue({ data: [{ objectId: 'obj-1' }] });
      const result = await Dynatrace.actions.createMaintenanceWindow.handler(mockContext, {
        name: 'Deploy freeze',
        filter: 'matchesValue(entity.name, "api")',
        startDateTime: '2026-07-30T14:00:00',
        durationMinutes: 60,
        description: 'Rolling deploy',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/settings/objects',
        [
          {
            schemaId: 'builtin:maintenance-windows',
            scope: 'environment',
            value: {
              name: 'Deploy freeze',
              enabled: true,
              autoDelete: true,
              filter: 'matchesValue(entity.name, "api")',
              description: 'Rolling deploy',
              schedule: {
                duration: 60,
                trigger: {
                  type: 'once',
                  once: { date: '2026-07-30T14:00:00' },
                },
              },
            },
          },
        ],
        { headers: authHeaders }
      );
      expect(result).toEqual([{ objectId: 'obj-1' }]);
    });

    it('requires createMaintenanceWindow fields', () => {
      expect(() => DynatraceCreateMaintenanceWindowInputSchema.parse({})).toThrow();
    });

    it('lists maintenance windows by schemaId', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [] } });
      await Dynatrace.actions.listMaintenanceWindows.handler(mockContext, { pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/settings/objects',
        {
          headers: authHeaders,
          params: {
            schemaIds: 'builtin:maintenance-windows',
            pageSize: 10,
          },
        }
      );
    });

    it('deletes a maintenance window by objectId', async () => {
      mockClient.delete.mockResolvedValue({ status: 204, data: '' });
      const result = await Dynatrace.actions.deleteMaintenanceWindow.handler(mockContext, {
        objectId: 'obj/1',
      });
      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/settings/objects/obj%2F1',
        { headers: authHeaders }
      );
      expect(result).toEqual({ deleted: true, objectId: 'obj/1' });
    });
  });

  describe('test', () => {
    it('GETs /problems with pageSize 1', async () => {
      mockClient.get.mockResolvedValue({ data: { problems: [] } });
      const testHandler = Dynatrace.test?.handler;
      expect(testHandler).toBeDefined();
      if (!testHandler) {
        throw new Error('expected test handler');
      }
      const result = await testHandler(mockContext);
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://abc123.live.dynatrace.com/api/v2/problems',
        { headers: authHeaders, params: { pageSize: 1 } }
      );
      expect(result).toEqual({});
    });

    it('throws when environmentUrl is missing', async () => {
      const badCtx = {
        ...mockContext,
        config: {},
      } as unknown as ActionContext;
      const testHandler = Dynatrace.test?.handler;
      expect(testHandler).toBeDefined();
      if (!testHandler) {
        throw new Error('expected test handler');
      }
      await expect(testHandler(badCtx)).rejects.toThrow(/environmentUrl/);
    });
  });
});
