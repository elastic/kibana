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
  EVENT_CHAIN_SOURCE_EXECUTION_HEADER,
  getEventChainContext,
  getOutboundEventChainHeaders,
  setWorkflowEventChainContext,
} from './event_chain_context';

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

  it('returns context from header when symbol is not set (HTTP path)', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: '2' },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({ depth: 2 });
  });

  it('returns context from header with case-insensitive header name', () => {
    const request = {
      headers: { 'X-Kibana-Event-Chain-Depth': '1' },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({ depth: 1 });
  });

  it('returns context with sourceExecutionId from headers (HTTP path)', () => {
    const request = {
      headers: {
        [EVENT_CHAIN_DEPTH_HEADER]: '2',
        [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: 'exec-loop',
      },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({
      depth: 2,
      sourceExecutionId: 'exec-loop',
    });
  });

  it('returns context with sourceExecutionId with case-insensitive source-execution header', () => {
    const request = {
      headers: {
        [EVENT_CHAIN_DEPTH_HEADER]: '1',
        'X-Kibana-Event-Chain-Source-Execution-Id': 'exec-parent',
      },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({
      depth: 1,
      sourceExecutionId: 'exec-parent',
    });
  });

  it('symbol takes precedence over header', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: '2' },
    } as unknown as KibanaRequest;
    setWorkflowEventChainContext(request, { depth: 0, sourceExecutionId: 'exec-1' });
    expect(getEventChainContext(request)).toEqual({
      depth: 0,
      sourceExecutionId: 'exec-1',
    });
  });

  it('returns undefined when header value is invalid', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: 'invalid' },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toBeUndefined();
  });

  it('returns undefined when header value is negative', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: '-1' },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toBeUndefined();
  });

  it('returns undefined when header value is an array with null first element', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: [null as any] },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toBeUndefined();
  });

  it('returns undefined when header value is an array with non-string first element', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: [42 as any] },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toBeUndefined();
  });

  it('returns undefined when header value is an empty string', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: '' },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toBeUndefined();
  });

  it('uses first element when header value is a string array', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: ['3', '5'] },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({ depth: 3 });
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

    it('returns depth header only when context comes from depth header only', () => {
      const request = {
        headers: { [EVENT_CHAIN_DEPTH_HEADER]: '0' },
      } as unknown as KibanaRequest;
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
  });

  describe('outbound HTTP header round-trip (kibana.request path)', () => {
    it('restores depth and sourceExecutionId on a new request from headers (no in-process Symbol)', () => {
      const engineRequest = {} as KibanaRequest;
      const original = { depth: 2, sourceExecutionId: 'parent-exec-uuid' };
      setWorkflowEventChainContext(engineRequest, original);

      const outbound = getOutboundEventChainHeaders(engineRequest);
      const inboundRequest = { headers: outbound } as unknown as KibanaRequest;

      expect(getEventChainContext(inboundRequest)).toEqual(original);
    });
  });
});
