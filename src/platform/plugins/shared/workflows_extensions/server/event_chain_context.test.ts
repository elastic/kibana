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
  EVENT_CHAIN_SOURCE_WORKFLOW_HEADER,
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
    setWorkflowEventChainContext(request, { depth: 0, sourceWorkflowId: 'wf-1' });
    expect(getEventChainContext(request)).toEqual({
      depth: 0,
      sourceWorkflowId: 'wf-1',
    });
  });

  it('overwrites context when set again', () => {
    const request = {} as KibanaRequest;
    setWorkflowEventChainContext(request, { depth: 0 });
    setWorkflowEventChainContext(request, { depth: 1, sourceWorkflowId: 'wf-2' });
    expect(getEventChainContext(request)).toEqual({
      depth: 1,
      sourceWorkflowId: 'wf-2',
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

  it('returns context with sourceWorkflowId from headers (HTTP path)', () => {
    const request = {
      headers: {
        [EVENT_CHAIN_DEPTH_HEADER]: '2',
        [EVENT_CHAIN_SOURCE_WORKFLOW_HEADER]: 'wf-loop',
      },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({
      depth: 2,
      sourceWorkflowId: 'wf-loop',
    });
  });

  it('returns context with sourceWorkflowId with case-insensitive source-workflow header', () => {
    const request = {
      headers: {
        [EVENT_CHAIN_DEPTH_HEADER]: '1',
        'X-Kibana-Event-Chain-Source-Workflow': 'my-workflow-id',
      },
    } as unknown as KibanaRequest;
    expect(getEventChainContext(request)).toEqual({
      depth: 1,
      sourceWorkflowId: 'my-workflow-id',
    });
  });

  it('symbol takes precedence over header', () => {
    const request = {
      headers: { [EVENT_CHAIN_DEPTH_HEADER]: '2' },
    } as unknown as KibanaRequest;
    setWorkflowEventChainContext(request, { depth: 0, sourceWorkflowId: 'wf-1' });
    expect(getEventChainContext(request)).toEqual({
      depth: 0,
      sourceWorkflowId: 'wf-1',
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

  describe('getOutboundEventChainHeaders', () => {
    it('returns empty object when request has no event chain context', () => {
      const request = {} as KibanaRequest;
      expect(getOutboundEventChainHeaders(request)).toEqual({});
    });

    it('returns both headers when context is set on request (sourceWorkflowId empty when not set)', () => {
      const request = {} as KibanaRequest;
      setWorkflowEventChainContext(request, { depth: 3 });
      expect(getOutboundEventChainHeaders(request)).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '3',
        [EVENT_CHAIN_SOURCE_WORKFLOW_HEADER]: '',
      });
    });

    it('returns both headers when context comes from depth header only', () => {
      const request = {
        headers: { [EVENT_CHAIN_DEPTH_HEADER]: '0' },
      } as unknown as KibanaRequest;
      expect(getOutboundEventChainHeaders(request)).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '0',
        [EVENT_CHAIN_SOURCE_WORKFLOW_HEADER]: '',
      });
    });

    it('returns depth and sourceWorkflowId headers when context has both', () => {
      const request = {} as KibanaRequest;
      setWorkflowEventChainContext(request, { depth: 1, sourceWorkflowId: 'wf-emit-loop' });
      expect(getOutboundEventChainHeaders(request)).toEqual({
        [EVENT_CHAIN_DEPTH_HEADER]: '1',
        [EVENT_CHAIN_SOURCE_WORKFLOW_HEADER]: 'wf-emit-loop',
      });
    });
  });
});
