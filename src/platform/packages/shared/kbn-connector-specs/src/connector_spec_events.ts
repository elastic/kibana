/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';

/**
 * Context passed to ConnectorSpecEvents.handleEvents after hub verification.
 *
 * Ingress auth (ingest token, provider signatures) is hub-orchestrated and
 * fail-closed before this handler runs.
 */
export interface ConnectorIngressContext {
  readonly spaceId: string;
  readonly log: Logger;
  readonly connectorId: string;
  readonly connectorTypeId: string;
  readonly config: Record<string, unknown>;
  readonly rawBody: unknown;
}

export interface EventPayload {
  readonly eventId: string;
  readonly correlationKey: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Spoke-defined HTTP ack (challenge / handshake). The hub returns this to the
 * caller and does **not** call emitters.
 */
export interface HandleEventsHttpResponse {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

/**
 * Result of handleEvents: either publish payloads or return a custom HTTP ack.
 *
 * - `emit`: hub runs `validateEmittedEvents` then dispatches; HTTP 202.
 * - `http`: hub returns `httpResponse` as-is (no emitters). Use for vendor
 *   challenge / handshake replies when a generic webhook must ack instead of
 *   emitting.
 */
export type HandleEventsResult =
  | { type: 'http'; httpResponse: HandleEventsHttpResponse }
  | { type: 'emit'; events: EventPayload[] };

/**
 * Declared event on a connector spec.
 */
export interface EventDefinition {
  /**
   * Globally unique across all registered connector specs.
   * Must equal `buildEventId(metadata.id, definitionKey)`.
   * Uniqueness follows from unique connector `metadata.id` values plus unique
   * keys within `definitions`.
   */
  readonly eventId: string;
  readonly title: string;
  readonly description: string;
  readonly eventSchema: z.ZodObject;
}

export interface ConnectorSpecEvents {
  readonly definitions: Record<string, EventDefinition>;
  handleEvents(ctx: ConnectorIngressContext): Promise<HandleEventsResult>;
}
