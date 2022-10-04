/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm } from '../../lib/apm';
import { ApmFields } from '../../lib/apm/apm_fields';
import { BaseSpan } from '../../lib/apm/base_span';
import { DistributedTrace } from './distributed_trace_client';

const opbeansRum = apm
  .service({ name: 'opbeans-rum', environment: 'prod', agentName: 'rum-js' })
  .instance('my-instance');

const opbeansNode = apm
  .service({ name: 'opbeans-node', environment: 'prod', agentName: 'nodejs' })
  .instance('my-instance');

const opbeansGo = apm
  .service({ name: 'opbeans-go', environment: 'prod', agentName: 'go' })
  .instance('my-instance');

describe('DistributedTrace', () => {
  describe('basic scenario', () => {
    it('should add latency', () => {
      const dt = new DistributedTrace({
        serviceInstance: opbeansRum,
        transactionName: 'Dashboard',
        timestamp: 0,
        children: (s) => {
          s.service({
            serviceInstance: opbeansNode,
            transactionName: 'GET /nodejs/products',

            children: (_) => {
              _.service({ serviceInstance: opbeansGo, transactionName: 'GET /gogo' });
              _.db({ type: 'elasticsearch', duration: 400 });
            },
          });
        },
      }).getTransaction();

      const traceDocs = getTraceDocs(dt);
      const formattedDocs = traceDocs.map((f) => {
        return {
          processorEvent: f['processor.event'],
          timestamp: f['@timestamp'],
          duration: (f['transaction.duration.us'] ?? f['span.duration.us'])! / 1000,
          name: f['transaction.name'] ?? f['span.name'],
        };
      });

      expect(formattedDocs).toEqual([
        { duration: 400, name: 'Dashboard', processorEvent: 'transaction', timestamp: 0 },
        { duration: 400, name: 'GET /nodejs/products', processorEvent: 'span', timestamp: 0 },
        {
          duration: 400,
          name: 'GET /nodejs/products',
          processorEvent: 'transaction',
          timestamp: 0,
        },
        { duration: 0, name: 'GET /gogo', processorEvent: 'span', timestamp: 0 },
        { duration: 0, name: 'GET /gogo', processorEvent: 'transaction', timestamp: 0 },
        { duration: 400, name: 'GET apm-*/_search', processorEvent: 'span', timestamp: 0 },
      ]);
    });
  });

  describe('latency', () => {
    it('should add latency', () => {
      const traceDocs = getSimpleScenario({ latency: 500 });
      const timestamps = traceDocs.map((f) => f['@timestamp']);
      expect(timestamps).toEqual([0, 0, 250, 250]);
    });

    it('should not add latency', () => {
      const traceDocs = getSimpleScenario();
      const timestamps = traceDocs.map((f) => f['@timestamp']);
      expect(timestamps).toEqual([0, 0, 0, 0]);
    });
  });

  describe('duration', () => {
    it('should add duration', () => {
      const traceDocs = getSimpleScenario({ duration: 3000 });
      const durations = traceDocs.map(
        (f) => (f['transaction.duration.us'] ?? f['span.duration.us'])! / 1000
      );
      expect(durations).toEqual([3000, 3000, 3000, 400]);
    });

    it('should not add duration', () => {
      const traceDocs = getSimpleScenario();
      const durations = traceDocs.map(
        (f) => (f['transaction.duration.us'] ?? f['span.duration.us'])! / 1000
      );
      expect(durations).toEqual([400, 400, 400, 400]);
    });
  });
});

function getTraceDocs(transaction: BaseSpan): ApmFields[] {
  const children = transaction.getChildren();
  if (children) {
    const childFields = children.flatMap((child) => getTraceDocs(child));
    return [transaction.fields, ...childFields];
  }

  return [transaction.fields];
}

function getSimpleScenario({ duration, latency }: { duration?: number; latency?: number } = {}) {
  const dt = new DistributedTrace({
    serviceInstance: opbeansRum,
    transactionName: 'Dashboard',
    timestamp: 0,
    children: (s) => {
      s.service({
        serviceInstance: opbeansNode,
        transactionName: 'GET /nodejs/products',
        duration,
        latency,

        children: (_) => {
          _.db({ type: 'elasticsearch', duration: 400 });
        },
      });
    },
  }).getTransaction();

  return getTraceDocs(dt);
}
