/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const SPOKE_HTTP_STATUS_MIN = 200;
export const SPOKE_HTTP_STATUS_MAX = 599;

/**
 * JSON-serializable values safe as a public HTTP body.
 * Rejects functions, class instances, Map/Error, Buffer, and similar.
 */
export const isJsonSerializableSpokeBody = (value: unknown): boolean => {
  if (value === null) {
    return true;
  }
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonSerializableSpokeBody);
  }
  if (valueType !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every(isJsonSerializableSpokeBody);
};

const jsonSerializableSpokeBodySchema = z
  .unknown()
  .refine(isJsonSerializableSpokeBody, 'Spoke HTTP body must be JSON-serializable');

export const eventPayloadSchema = z.object({
  eventId: z.string().min(1),
  correlationKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const handleEventsHttpResponseSchema = z.object({
  status: z.number().int().min(SPOKE_HTTP_STATUS_MIN).max(SPOKE_HTTP_STATUS_MAX),
  body: jsonSerializableSpokeBodySchema.optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const handleEventsResultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('http'),
    httpResponse: handleEventsHttpResponseSchema,
  }),
  z.object({
    type: z.literal('emit'),
    events: z.array(eventPayloadSchema),
  }),
]);

export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type HandleEventsHttpResponse = z.infer<typeof handleEventsHttpResponseSchema>;
export type HandleEventsResult = z.infer<typeof handleEventsResultSchema>;

export type ParseHandleEventsResult =
  | { ok: true; data: HandleEventsResult }
  | { ok: false; message: string };

const HANDLE_EVENTS_PARSE_ERROR_MAX_LENGTH = 256;

const formatParseErrorMessage = (message: string): string => {
  if (message.length <= HANDLE_EVENTS_PARSE_ERROR_MAX_LENGTH) {
    return message;
  }
  return `${message.slice(0, HANDLE_EVENTS_PARSE_ERROR_MAX_LENGTH)}…`;
};

/**
 * Runtime validation of `handleEvents` results. The hub must call this before
 * forwarding HTTP acks or publishing emits (`validateEmittedEvents` still runs
 * on the emit arm).
 */
export const parseHandleEventsResult = (value: unknown): ParseHandleEventsResult => {
  const parsed = handleEventsResultSchema.safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.length ? `${first.path.join('.')}: ` : '';
    const message = first ? `${path}${first.message}` : parsed.error.message;
    return { ok: false, message: formatParseErrorMessage(message) };
  }
  return { ok: true, data: parsed.data };
};
