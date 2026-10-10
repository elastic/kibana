/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import {
  AGENTIC_COUNTER_TYPE,
  ELASTIC_CLIENT_META_HEADER,
  UNKNOWN_AGENT_CODE,
  telemetryHandler,
} from './telemetry_handler';

describe('dashboard api telemetry handler', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const usageCounter = usageCollection.createUsageCounter('dashboard_api');
  const routePath = '/api/dashboards/{id}';
  const actualPath = '/api/dashboards/123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('telemetryHandler', () => {
    it('does not increment when usageCounter is unavailable', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, {}, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('does not increment for Kibana-origin requests', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
        routePath,
        headers: {
          [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
        },
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, { usageCounter }, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('does not increment when `route.routePath` is missing', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: actualPath,
      });

      const response = { status: 200 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, { usageCounter }, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('returns handler response and increments exactly once', async () => {
      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/api/dashboards',
        routePath: '/api/dashboards',
      });

      const response = { status: 201 } as IKibanaResponse<any>;
      const result = await telemetryHandler(request, { usageCounter }, () => response);

      expect(result).toBe(response);
      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'post /api/dashboards 201',
      });
    });
  });

  describe('agentic telemetry', () => {
    const cliUserAgent =
      'elastic-cli/0.6.0 (linux x64; Node.js v22.0.0; anthropic/claude-sonnet-4-5)';
    const counterName = 'post /api/dashboards 201';
    const response = { status: 201 } as IKibanaResponse<any>;

    const createRequest = (headers: Record<string, string>) =>
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/api/dashboards',
        routePath: '/api/dashboards',
        headers,
      });

    const expectAgenticCounters = (agentCode: string) => {
      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(3);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({ counterName });
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName,
        counterType: AGENTIC_COUNTER_TYPE,
      });
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName,
        counterType: `elastic-cli:${agentCode}`,
      });
    };

    const expectOnlyDefaultCounter = () => {
      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({ counterName });
    };

    it('increments agentic and agent counters for elastic-cli requests with an agent code', async () => {
      const request = createRequest({
        'user-agent': cliUserAgent,
        [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0,js=22.0.0,t=0.6.0,ag=cc',
      });

      const result = await telemetryHandler(
        request,
        { usageCounter, trackAgentic: true },
        () => response
      );

      expect(result).toBe(response);
      expectAgenticCounters('cc');
    });

    it('passes through agent codes that are not known today', async () => {
      const request = createRequest({
        'user-agent': cliUserAgent,
        [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0,js=22.0.0,t=0.6.0,ag=zz',
      });

      await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

      expectAgenticCounters('zz');
    });

    it('lower-cases the agent code', async () => {
      const request = createRequest({
        'user-agent': cliUserAgent,
        [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0, ag=CC',
      });

      await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

      expectAgenticCounters('cc');
    });

    it.each([['ag=a b'], [`ag=${'x'.repeat(50)}`], ['ag=c:c']])(
      'counts malformed agent codes (%s) as unknown',
      async (agentEntry) => {
        const request = createRequest({
          'user-agent': cliUserAgent,
          [ELASTIC_CLIENT_META_HEADER]: `et=0.6.0,${agentEntry}`,
        });

        await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

        expectAgenticCounters(UNKNOWN_AGENT_CODE);
      }
    );

    it('reads the agent code from duplicate client meta headers joined by Node', async () => {
      const request = createRequest({
        'user-agent': cliUserAgent,
        [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0,js=22.0.0, ag=cx',
      });

      await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

      expectAgenticCounters('cx');
    });

    it('does not increment agentic counters for elastic-cli requests without client meta', async () => {
      const request = createRequest({ 'user-agent': cliUserAgent });

      await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

      expectOnlyDefaultCounter();
    });

    it.each([['et=0.6.0,js=22.0.0,t=0.6.0'], ['et=0.6.0,ag=']])(
      'does not increment agentic counters when client meta (%s) has no agent code',
      async (clientMeta) => {
        const request = createRequest({
          'user-agent': cliUserAgent,
          [ELASTIC_CLIENT_META_HEADER]: clientMeta,
        });

        await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

        expectOnlyDefaultCounter();
      }
    );

    it.each([['elastic-agentic'], ['Mozilla/5.0'], ['foo elastic-cli/0.6.0']])(
      'does not increment agentic counters for non elastic-cli user-agent %s',
      async (userAgent) => {
        const request = createRequest({
          'user-agent': userAgent,
          [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0,ag=cc',
        });

        await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

        expectOnlyDefaultCounter();
      }
    );

    it('does not increment any counter for Kibana-origin elastic-cli requests', async () => {
      const request = createRequest({
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
        'user-agent': cliUserAgent,
        [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0,ag=cc',
      });

      await telemetryHandler(request, { usageCounter, trackAgentic: true }, () => response);

      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('does not increment agentic counters when trackAgentic is not set', async () => {
      const request = createRequest({
        'user-agent': cliUserAgent,
        [ELASTIC_CLIENT_META_HEADER]: 'et=0.6.0,ag=cc',
      });

      await telemetryHandler(request, { usageCounter }, () => response);

      expectOnlyDefaultCounter();
    });
  });
});
