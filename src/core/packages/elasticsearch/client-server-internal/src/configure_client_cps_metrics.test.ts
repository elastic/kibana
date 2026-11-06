/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./log_query_and_deprecation', () => ({
  __esModule: true,
  instrumentEsQueryAndDeprecationLogger: jest.fn(),
}));

const mockCounterAdd = jest.fn();
// Only the CPS meter is faked; every other meter (e.g. the agent manager's) keeps the real
// no-op implementation so unrelated instrumentation still works.
jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  return {
    ...actual,
    metrics: {
      getMeter: (name: string) => {
        const meter = actual.metrics.getMeter(name);
        if (name !== 'kibana.elasticsearch.cps') {
          return meter;
        }
        return Object.assign(Object.create(meter), {
          createCounter: () => ({ add: mockCounterAdd }),
        });
      },
    },
  };
});

import { parseClientOptionsMock, ClientMock } from './configure_client.test.mocks';
import type { Client, DiagnosticResult, TransportRequestParams } from '@elastic/elasticsearch';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { configureClient } from './configure_client';
import { type AgentFactoryProvider, AgentManager } from './agent_manager';

const kibanaVersion = '1.0.0';

const createFakeConfig = (): ElasticsearchClientConfig =>
  ({ type: 'fake-config' } as unknown as ElasticsearchClientConfig);

const createFakeClient = (): Client => {
  const actualEs = jest.requireActual('@elastic/elasticsearch');
  return new actualEs.Client({ nodes: ['http://localhost'] });
};

/**
 * Minimal `DiagnosticResult` carrying the request options context that `instrumentCpsMetrics`
 * reads. Only the fields the instrumentation touches are populated.
 */
const createResponseEvent = ({
  cpsRoutingContext,
  statusCode = 200,
  params = { method: 'POST', path: '/my-index/_update_by_query' },
}: {
  cpsRoutingContext?: Record<string, unknown>;
  statusCode?: number;
  params?: TransportRequestParams;
}): DiagnosticResult => ({
  body: {},
  statusCode,
  headers: {},
  warnings: null,
  meta: {
    request: {
      params,
      options: { context: cpsRoutingContext ? { cpsRoutingContext } : undefined },
    } as DiagnosticResult['meta']['request'],
  } as DiagnosticResult['meta'],
});

const baseRoutingContext = {
  routingType: 'none',
  routingAccepted: false,
  unsupportedParamStripped: false,
  cpsEnabled: true,
  apiName: 'update_by_query',
  bypassReason: 'api_does_not_support_routing',
  requestId: 'request-id',
  routePath: '/api/ml/notifications',
  requestPath: '/my-index/_update_by_query',
};

describe('CPS metrics instrumentation', () => {
  let logger: MockedLogger;
  let config: ElasticsearchClientConfig;
  let agentFactoryProvider: AgentFactoryProvider;
  let client: Client;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    config = createFakeConfig();
    parseClientOptionsMock.mockReturnValue({});
    ClientMock.mockImplementation(() => createFakeClient());
    agentFactoryProvider = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });

    client = configureClient(config, {
      logger,
      type: 'test',
      scoped: false,
      agentFactoryProvider,
      kibanaVersion,
      onRequest: jest.fn(),
    });
  });

  afterEach(() => {
    parseClientOptionsMock.mockReset();
    ClientMock.mockReset();
    jest.clearAllMocks();
  });

  const getMetricAttributes = (): Record<string, string | number | boolean> =>
    mockCounterAdd.mock.calls[0][1];

  it('reports the unsupported param strip when one occurred', () => {
    client.diagnostic.emit(
      'response',
      null,
      createResponseEvent({
        cpsRoutingContext: { ...baseRoutingContext, unsupportedParamStripped: true },
      })
    );

    expect(mockCounterAdd).toHaveBeenCalledTimes(1);
    expect(getMetricAttributes()['kibana.cps.routing.unsupported_param_stripped']).toBe(true);
  });

  it('attaches the attribute as false when no strip occurred', () => {
    client.diagnostic.emit(
      'response',
      null,
      createResponseEvent({ cpsRoutingContext: baseRoutingContext })
    );

    expect(getMetricAttributes()['kibana.cps.routing.unsupported_param_stripped']).toBe(false);
  });

  it('attaches the attribute on every routing type, not only bypassed requests', () => {
    client.diagnostic.emit(
      'response',
      null,
      createResponseEvent({
        cpsRoutingContext: {
          ...baseRoutingContext,
          routingType: 'injected',
          routingAccepted: true,
          bypassReason: undefined,
        },
      })
    );

    expect(getMetricAttributes()).toEqual(
      expect.objectContaining({
        'kibana.cps.routing.type': 'injected',
        'kibana.cps.routing.unsupported_param_stripped': false,
      })
    );
  });

  it('falls back to false for a context that predates the field', () => {
    const { unsupportedParamStripped, ...contextWithoutField } = baseRoutingContext;

    client.diagnostic.emit(
      'response',
      null,
      createResponseEvent({ cpsRoutingContext: contextWithoutField })
    );

    expect(getMetricAttributes()['kibana.cps.routing.unsupported_param_stripped']).toBe(false);
  });

  it('leaves the existing routing attributes unchanged', () => {
    client.diagnostic.emit(
      'response',
      null,
      createResponseEvent({
        cpsRoutingContext: { ...baseRoutingContext, unsupportedParamStripped: true },
        statusCode: 200,
      })
    );

    expect(getMetricAttributes()).toEqual({
      'kibana.cps.enabled': true,
      'kibana.cps.routing.type': 'none',
      'kibana.cps.routing.accepted': false,
      'kibana.cps.routing.unsupported_param_stripped': true,
      'kibana.cps.routing.bypass_reason': 'api_does_not_support_routing',
      'db.operation.name': 'update_by_query',
      'http.response.status_code': 200,
    });
  });

  it('does not emit a metric for requests without a CPS routing context', () => {
    client.diagnostic.emit('response', null, createResponseEvent({}));

    expect(mockCounterAdd).not.toHaveBeenCalled();
  });

  it('records the strip on the debug log line without changing event.kind', () => {
    client.diagnostic.emit(
      'response',
      null,
      createResponseEvent({
        cpsRoutingContext: { ...baseRoutingContext, unsupportedParamStripped: true },
      })
    );

    const [, meta] = loggingSystemMock.collect(logger).debug[0];

    expect(meta).toEqual(
      expect.objectContaining({
        event: expect.objectContaining({ kind: 'alert' }),
        cps: expect.objectContaining({
          routing_type: 'none',
          bypass_reason: 'api_does_not_support_routing',
          unsupported_param_stripped: true,
        }),
      })
    );
  });
});
