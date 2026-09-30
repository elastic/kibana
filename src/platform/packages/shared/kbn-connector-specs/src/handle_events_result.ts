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

export const MAX_HANDLE_EVENTS_EVENT_ID_LENGTH = 128;
export const MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH = 128;
export const MAX_HANDLE_EVENTS_EVENTS = 25;
export const MAX_HANDLE_EVENTS_EVENTS_LIMIT = 250;
export const MAX_HANDLE_EVENTS_PAYLOAD_KEYS = 32;
export const MAX_HANDLE_EVENTS_PAYLOAD_KEY_LENGTH = 256;
export const MAX_HANDLE_EVENTS_PAYLOAD_BYTES = 1024 * 1024;
export const MAX_HANDLE_EVENTS_HTTP_BODY_BYTES = 8 * 1024;
export const MAX_HANDLE_EVENTS_HEADERS = 8;
export const MAX_HANDLE_EVENTS_HEADER_NAME_LENGTH = 64;
export const MAX_HANDLE_EVENTS_HEADER_VALUE_LENGTH = 1024;

export interface ParseHandleEventsLimits {
  maxEvents?: number;
  maxPayloadBytes?: number;
}

/**
 * JSON-serializable values safe as a public HTTP body.
 * Rejects functions, class instances, Map/Error, Buffer, and similar.
 */
export const isJsonSerializableSpokeBody = (value: unknown): boolean => {
  try {
    if (JSON.stringify(value) === undefined) {
      return false;
    }
  } catch {
    return false;
  }
  return isPlainJsonStructure(value);
};

const isPlainJsonStructure = (value: unknown): boolean => {
  if (value === null) {
    return true;
  }
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isPlainJsonStructure);
  }
  if (valueType !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every(isPlainJsonStructure);
};

const jsonUtf8ByteLength = (value: unknown): number | undefined => {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return undefined;
    }
    return new TextEncoder().encode(json).byteLength;
  } catch {
    return undefined;
  }
};

const isWithinJsonByteLimit = (value: unknown, maxBytes: number): boolean => {
  const byteLength = jsonUtf8ByteLength(value);
  return byteLength !== undefined && byteLength <= maxBytes;
};

const jsonSerializableSpokeBodySchema = z
  .unknown()
  .refine(isJsonSerializableSpokeBody, 'HTTP ack body must be JSON-serializable')
  .refine(
    (value) => isWithinJsonByteLimit(value, MAX_HANDLE_EVENTS_HTTP_BODY_BYTES),
    `HTTP ack body must be at most ${MAX_HANDLE_EVENTS_HTTP_BODY_BYTES} bytes`
  );

const handleEventsHeadersSchema = z
  .record(
    z.string().min(1).max(MAX_HANDLE_EVENTS_HEADER_NAME_LENGTH),
    z.string().max(MAX_HANDLE_EVENTS_HEADER_VALUE_LENGTH)
  )
  .refine(
    (headers) => Object.keys(headers).length <= MAX_HANDLE_EVENTS_HEADERS,
    `headers must contain at most ${MAX_HANDLE_EVENTS_HEADERS} entries`
  );

export const handleEventsHttpResponseSchema = z.object({
  status: z.number().int().min(SPOKE_HTTP_STATUS_MIN).max(SPOKE_HTTP_STATUS_MAX),
  body: jsonSerializableSpokeBodySchema.optional(),
  headers: handleEventsHeadersSchema.optional(),
});

const resolveHandleEventsLimits = (
  limits: ParseHandleEventsLimits = {}
): { maxEvents: number; maxPayloadBytes: number } => {
  const requestedEvents = limits.maxEvents ?? MAX_HANDLE_EVENTS_EVENTS;
  const maxEvents = Math.min(Math.max(1, requestedEvents), MAX_HANDLE_EVENTS_EVENTS_LIMIT);
  const maxPayloadBytes = Math.max(1, limits.maxPayloadBytes ?? MAX_HANDLE_EVENTS_PAYLOAD_BYTES);
  return { maxEvents, maxPayloadBytes };
};

const createHandleEventsPayloadSchema = (maxPayloadBytes: number) =>
  z
    .record(z.string().min(1).max(MAX_HANDLE_EVENTS_PAYLOAD_KEY_LENGTH), z.unknown())
    .refine(
      (value) => Object.keys(value).length <= MAX_HANDLE_EVENTS_PAYLOAD_KEYS,
      `payload must contain at most ${MAX_HANDLE_EVENTS_PAYLOAD_KEYS} keys`
    )
    .refine(
      (value) => isWithinJsonByteLimit(value, maxPayloadBytes),
      `payload must be at most ${maxPayloadBytes} bytes`
    );

const createEventPayloadSchema = (maxPayloadBytes: number) =>
  z.object({
    eventId: z.string().min(1).max(MAX_HANDLE_EVENTS_EVENT_ID_LENGTH),
    correlationKey: z.string().min(1).max(MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH),
    payload: createHandleEventsPayloadSchema(maxPayloadBytes),
  });

export const eventPayloadSchema = createEventPayloadSchema(MAX_HANDLE_EVENTS_PAYLOAD_BYTES);

const createHandleEventsResultSchema = (limits: ParseHandleEventsLimits = {}) => {
  const { maxEvents, maxPayloadBytes } = resolveHandleEventsLimits(limits);
  return z.discriminatedUnion('type', [
    z.object({
      type: z.literal('http'),
      httpResponse: handleEventsHttpResponseSchema,
    }),
    z.object({
      type: z.literal('emit'),
      events: z
        .array(createEventPayloadSchema(maxPayloadBytes))
        .max(maxEvents)
        .refine((events) => {
          const totalBytes = events.reduce((sum, event) => {
            return sum + (jsonUtf8ByteLength(event.payload) ?? 0);
          }, 0);
          return totalBytes <= maxPayloadBytes;
        }, `events payloads must total at most ${maxPayloadBytes} bytes`),
    }),
  ]);
};

export const handleEventsResultSchema = createHandleEventsResultSchema();

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
 * on the emit arm). Pass live `maxEmitted` / `maxBodyBytes` so kibana.yml
 * raises are respected; omitted limits use the Actions inboundEvents defaults.
 */
export const parseHandleEventsResult = (
  value: unknown,
  limits?: ParseHandleEventsLimits
): ParseHandleEventsResult => {
  const parsed = createHandleEventsResultSchema(limits).safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.length ? `${first.path.join('.')}: ` : '';
    const message = first ? `${path}${first.message}` : parsed.error.message;
    return { ok: false, message: formatParseErrorMessage(message) };
  }
  return { ok: true, data: parsed.data };
};
