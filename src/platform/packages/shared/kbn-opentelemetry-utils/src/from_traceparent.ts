/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { SpanContext, TraceFlags } from '@opentelemetry/api';

// W3C Trace Context header regex (case-insensitive)
// version 2 hex, trace-id 32 hex, span-id 16 hex, flags 2 hex
const TRACEPARENT_REGEX = /^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i;

// Helpers to check if ID is not all zeros (spec prohibits all-zero ids)
const isAllZeros = (str: string) => /^0+$/.test(str);

export function fromTraceparent(traceparent: string): SpanContext | undefined {
  if (!traceparent) {
    return undefined;
  }

  const header = traceparent.trim();

  if (!TRACEPARENT_REGEX.test(header)) {
    return undefined;
  }

  const [version, traceId, spanId, flags] = header.split('-');

  // Reject all-zero trace/span IDs per spec
  if (isAllZeros(traceId) || isAllZeros(spanId)) {
    return undefined;
  }

  // Currently we only support version 00. Future versions are ignored per spec (forward compatibility)
  if (version !== '00' && version.toLowerCase() !== '00') {
    return undefined;
  }

  const traceFlags = parseInt(flags, 16) as TraceFlags;

  return {
    traceId,
    spanId,
    traceFlags,
    isRemote: true,
  };
}
