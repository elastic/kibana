/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';

export { X_ELASTIC_INTERNAL_ORIGIN_REQUEST };

/**
 * Context attached to the request when a workflow runs, so that when code
 * in that workflow emits an event (e.g. via emitEvent), we can infer the
 * event-chain depth and enforce a cap to prevent infinite loops.
 * Depth is incremented for every step in the chain (any workflow); the trigger
 * event handler caps scheduling when depth exceeds the configured max.
 */
export interface EventChainContext {
  depth: number;
  sourceExecutionId?: string;
}

/**
 * HTTP header name used when a workflow step (e.g. kibana.request) makes an outbound request
 * to Kibana. The execution engine sets this to the current event-chain depth so the server
 * can restore context on the incoming request and enforce the event-chain depth cap.
 */
export const EVENT_CHAIN_DEPTH_HEADER = 'x-kibana-event-chain-depth';

/**
 * HTTP header for the workflow execution id associated with the current chain hop. Set on outbound
 * requests so the server can restore `sourceExecutionId` on the incoming request.
 */
export const EVENT_CHAIN_SOURCE_EXECUTION_HEADER = 'x-kibana-event-chain-source-execution-id';

/**
 * Symbol used to attach event-chain context to a KibanaRequest.
 */
export const WORKFLOW_EVENT_CHAIN_CONTEXT = Symbol.for('kibana.workflows.eventChainContext');

interface RequestWithEventChainContext extends KibanaRequest {
  [key: symbol]: EventChainContext | undefined;
}

function getStoredContext(request: KibanaRequest): EventChainContext | undefined {
  return (request as RequestWithEventChainContext)[WORKFLOW_EVENT_CHAIN_CONTEXT];
}

function setStoredContext(request: KibanaRequest, context: EventChainContext): void {
  (request as RequestWithEventChainContext)[WORKFLOW_EVENT_CHAIN_CONTEXT] = context;
}

/** Normalize header value (string or string[]) to a single trimmed string, or undefined if missing/empty. */
function toSingleHeaderString(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = typeof raw === 'string' ? raw : raw[0];
  if (value == null || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function getHeaderValue(headers: KibanaRequest['headers'], headerName: string): string | undefined {
  if (headers == null || typeof headers !== 'object') return undefined;
  const lower = headerName.toLowerCase();
  const raw =
    headers[headerName] ?? Object.entries(headers).find(([k]) => k.toLowerCase() === lower)?.[1];
  return toSingleHeaderString(raw);
}

function parseDepthFromHeaders(headers: KibanaRequest['headers']): number | undefined {
  const value = getHeaderValue(headers, EVENT_CHAIN_DEPTH_HEADER);
  if (value === undefined) {
    return undefined;
  }
  const depth = parseInt(value, 10);
  return !Number.isNaN(depth) && depth >= 0 ? depth : undefined;
}

function parseSourceExecutionIdFromHeaders(headers: KibanaRequest['headers']): string | undefined {
  return getHeaderValue(headers, EVENT_CHAIN_SOURCE_EXECUTION_HEADER);
}

/**
 * Returns the event-chain context for the request.
 *
 * Two trusted paths:
 *  1. In-process (fakeRequest): the execution engine called setWorkflowEventChainContext before
 *     any step runs, so the Symbol is present and takes precedence.
 *  2. Inbound HTTP from kibana.request step: no Symbol exists, but the step marks its outbound
 *     call with x-elastic-internal-origin so request.isInternalApiRequest is true. Only then are
 *     the event-chain headers parsed.
 *
 * Note: isInternalApiRequest is derived from the presence of the x-elastic-internal-origin request
 * header (see KibanaRequest constructor). It is not enforced at the network layer, so a
 * sufficiently informed external caller could set it. This gate stops naive spoofing but should
 * not be treated as a hard trust boundary.
 */
export function getEventChainContext(request: KibanaRequest): EventChainContext | undefined {
  const stored = getStoredContext(request);
  if (stored !== undefined) {
    return stored;
  }
  if (!request.isInternalApiRequest) {
    return undefined;
  }
  const depth = parseDepthFromHeaders(request.headers);
  if (depth === undefined) {
    return undefined;
  }
  const sourceExecutionId = parseSourceExecutionIdFromHeaders(request.headers);
  return { depth, ...(sourceExecutionId !== undefined && { sourceExecutionId }) };
}

/**
 * Sets the event-chain context on the request. Called by the execution engine
 * at the start of a workflow run so that any emitEvent call using this request
 * (e.g. in-process with the fakeRequest) will have the correct depth and sourceExecutionId.
 */
export function setWorkflowEventChainContext(
  request: KibanaRequest,
  context: EventChainContext
): void {
  setStoredContext(request, context);
}

/**
 * Returns headers that should be added to outbound HTTP requests to Kibana
 * when the request is made from a workflow step (e.g. kibana.request).
 * Enables the server to restore event-chain context and enforce depth limits.
 */
export function getOutboundEventChainHeaders(request: KibanaRequest): Record<string, string> {
  const ctx = getEventChainContext(request);
  if (!ctx) {
    return {};
  }
  return {
    [EVENT_CHAIN_DEPTH_HEADER]: String(ctx.depth),
    ...(ctx.sourceExecutionId !== undefined && ctx.sourceExecutionId !== ''
      ? { [EVENT_CHAIN_SOURCE_EXECUTION_HEADER]: ctx.sourceExecutionId }
      : {}),
  };
}
