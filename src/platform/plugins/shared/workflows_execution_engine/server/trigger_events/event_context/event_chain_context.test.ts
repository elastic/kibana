/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  EVENT_CHAIN_DEPTH_HEADER,
  EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER,
  EVENT_CHAIN_SOURCE_EXECUTION_HEADER,
  EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER,
  getEventChainContext,
  getEventChainDepthFromHeaders,
  getOutboundEventChainHeaders,
  setWorkflowEventChainContext,
} from './event_chain_context';

/** Simulate a request that carries x-elastic-internal-origin (e.g. from kibana.request step). */
function internalRequest(headers: Record<string, string | string[]>): KibanaRequest {
  return { headers, isInternalApiRequest: true } as unknown as KibanaRequest;
}

/** Simulate a request from an external (untrusted) caller — no x-elastic-internal-origin. */
function externalRequest(headers: Record<string, string | string[]>): KibanaRequest {
  return { headers, isInternalApiRequest: false } as unknown as KibanaRequest;
}

describe('event_chain_context', () => {
  it('returns undefined when request has no context set and no header', () => {
    const request = {} as KibanaRequest;
    expect(getEventChainContext(request)).toBeUndefined();
  });

  it('returns context after setWorkflowEventChainContext', () => {
    const request = {} as KibanaRequest;
    setWorkflowEventChainContext(request, { depth: 0, sourceExecutionId: 'exec-1' });
    expect(getEventChainContext(request)).toEqual({
      depth: 0,
      sourceExecutionId: 'exec-1',
    });
  });

  it('overwrites context when set again', () => {
    const request = {} as KibanaRequest;
    setWorkflowEventChainContext(request, { depth: 0 });
    setWorkflowEventChainContext(request, { depth: 1, sourceExecutionId: 'exec-2' });
    expect(getEventChainContext(request)).toEqual({
      depth: 1,
      sourceExecutionId: 'exec-2',
    });
  });

  it('symbol takes precedence over headers even for internal requests', () => {
    const request = internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '2' });
    setWorkflowEventChainContext(request, { depth: 0, sourceExecutionId: 'exec-1' });
    expect(getEventChainContext(request)).toEqual({ depth: 0, sourceExecutionId: 'exec-1' });
  });

  describe('internal requests (x-elastic-internal-origin present)', () => {
    it('returns context from depth header', () => {
      expect(getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '2' }))).toEqual({
        depth: 2,
      });
    });

    it('parses depth with case-insensitive header name', () => {
      expect(getEventChainContext(internalRequest({ 'X-Kibana-Event-Chain-Depth': '1' }))).toEqual({
        depth: 1,
      });
    });

    it('returns context with sourceExecutionId from headers', () => {
      expect(
        getEventChainContext(
          internalRequest({
            [EVENT_CHAIN_DEPTH_HEADER]: '2',
            [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: 'exec-loop',
          })
        )
      ).toEqual({ depth: 2, sourceExecutionId: 'exec-loop' });
    });

    it('parses sourceExecutionId with case-insensitive header name', () => {
      expect(
        getEventChainContext(
          internalRequest({
            [EVENT_CHAIN_DEPTH_HEADER]: '1',
            'X-Kibana-Event-Chain-Source-Execution-Id': 'exec-parent',
          })
        )
      ).toEqual({ depth: 1, sourceExecutionId: 'exec-parent' });
    });

    it('returns undefined when depth header value is invalid', () => {
      expect(
        getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: 'invalid' }))
      ).toBeUndefined();
    });

    it('returns depth -1 sentinel when header is -1 (unknown persisted depth)', () => {
      expect(getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '-1' }))).toEqual({
        depth: -1,
      });
    });

    it('returns undefined when depth header value is negative other than -1', () => {
      expect(
        getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '-2' }))
      ).toBeUndefined();
    });

    it('returns undefined when depth header value is an array with null first element', () => {
      expect(
        getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: [null as any] }))
      ).toBeUndefined();
    });

    it('returns undefined when depth header value is an array with non-string first element', () => {
      expect(
        getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: [42 as any] }))
      ).toBeUndefined();
    });

    it('returns undefined when depth header value is an empty string', () => {
      expect(
        getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '' }))
      ).toBeUndefined();
    });

    it('uses first element when depth header value is a string array', () => {
      expect(
        getEventChainContext(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: ['3', '5'] }))
      ).toEqual({ depth: 3 });
    });

    it('ignores visited-workflows header when base64url value exceeds byte cap (no decode)', () => {
      const oversized = 'A'.repeat(65537);
      expect(
        getEventChainContext(
          internalRequest({
            [EVENT_CHAIN_DEPTH_HEADER]: '1',
            [EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER]: oversized,
          })
        )
      ).toEqual({ depth: 1 });
    });

    it('getEventChainDepthFromHeaders mirrors depth header parsing', () => {
      expect(
        getEventChainDepthFromHeaders(internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '4' }).headers)
      ).toBe(4);
      expect(
        getEventChainDepthFromHeaders(
          internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: 'invalid' }).headers
        )
      ).toBeUndefined();
    });
  });

  describe('external requests (no x-elastic-internal-origin)', () => {
    it('returns undefined even when depth header is present', () => {
      expect(
        getEventChainContext(externalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '2' }))
      ).toBeUndefined();
    });

    it('returns undefined even when both chain headers are present', () => {
      expect(
        getEventChainContext(
          externalRequest({
            [EVENT_CHAIN_DEPTH_HEADER]: '0',
            [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: 'attacker-exec',
          })
        )
      ).toBeUndefined();
    });
  });

  describe('getOutboundEventChainHeaders', () => {
    it('returns empty object when request has no event chain context', () => {
      const request = {} as KibanaRequest;
      expect(getOutboundEventChainHeaders(request)).toEqual({});
    });

    it('returns depth header only when sourceExecutionId is not set', () => {
      const request = {} as KibanaRequest;
      setWorkflowEventChainContext(request, { depth: 3 });
      expect(getOutboundEventChainHeaders(request)).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '3',
      });
    });

    it('returns empty object when request has headers but no in-process Symbol', () => {
      const request = internalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '0' });
      // getOutboundEventChainHeaders reads via getEventChainContext which returns { depth: 0 }
      // for an internal request, so this correctly produces outbound headers
      expect(getOutboundEventChainHeaders(request)).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '0',
      });
    });

    it('returns depth and sourceExecutionId headers when context has both', () => {
      const request = {} as KibanaRequest;
      setWorkflowEventChainContext(request, { depth: 1, sourceExecutionId: 'exec-emit-loop' });
      expect(getOutboundEventChainHeaders(request)).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '1',
        [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: 'exec-emit-loop',
      });
    });

    it('includes visited header, source execution id, and emitter execution id when provided', () => {
      const request = {} as KibanaRequest;
      setWorkflowEventChainContext(request, {
        depth: 2,
        sourceExecutionId: 'exec-src',
        visitedWorkflowIds: ['wf-a'],
      });
      expect(getOutboundEventChainHeaders(request, 'exec-uuid')).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '2',
        [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: 'exec-src',
        [EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER]: Buffer.from(
          JSON.stringify(['wf-a']),
          'utf8'
        ).toString('base64url'),
        [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: 'exec-uuid',
      });
    });

    it('encodes visited ids so the header stays within the byte cap', () => {
      const longId = 'w'.repeat(600);
      const request = {} as KibanaRequest;
      setWorkflowEventChainContext(request, {
        depth: 0,
        visitedWorkflowIds: Array.from({ length: 128 }, () => longId),
      });
      const outbound = getOutboundEventChainHeaders(request);
      const visitedHeader = outbound[EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER];
      expect(typeof visitedHeader).toBe('string');
      expect(visitedHeader!.length).toBeLessThanOrEqual(65536);
      const parsed = getEventChainContext(
        internalRequest({
          [EVENT_CHAIN_DEPTH_HEADER]: '0',
          [EVENT_CHAIN_VISITED_WORKFLOW_IDS_HEADER]: visitedHeader!,
        })
      );
      expect(parsed?.visitedWorkflowIds?.length).toBeGreaterThan(0);
      expect(parsed?.visitedWorkflowIds?.length).toBeLessThanOrEqual(128);
    });
  });

  describe('outbound HTTP header round-trip (kibana.request path)', () => {
    it('restores depth and sourceExecutionId on a new internal request from headers', () => {
      // Simulate fakeRequest in the execution engine with Symbol set
      const engineRequest = {} as KibanaRequest;
      const original = { depth: 2, sourceExecutionId: 'parent-exec-uuid' };
      setWorkflowEventChainContext(engineRequest, original);

      // kibana.request step produces outbound headers from Symbol context
      const outbound = getOutboundEventChainHeaders(engineRequest);

      // The inbound request on the receiving Kibana server has isInternalApiRequest: true
      // because kibana.request step sends x-elastic-internal-origin: Kibana
      const inbound = internalRequest(outbound);
      expect(getEventChainContext(inbound)).toEqual(original);
    });
  });

  /**
   * Security: x-kibana-event-chain-depth must not be trusted from external callers.
   *
   * An external caller including x-kibana-event-chain-depth: 0 on any HTTP request
   * that reaches a Kibana route which subsequently calls emitEvent would reset the
   * chain counter, granting extra event-chain hops beyond the configured maxChainDepth.
   * The gate on isInternalApiRequest prevents this.
   */
  describe('security: header depth is not trusted from external callers', () => {
    it('does not trust depth=0 from an external caller with no in-process context', () => {
      const ctx = getEventChainContext(externalRequest({ [EVENT_CHAIN_DEPTH_HEADER]: '0' }));
      expect(ctx).toBeUndefined();
    });
  });
});
