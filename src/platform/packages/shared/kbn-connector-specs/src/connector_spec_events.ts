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
import type { HandleEventsResult } from './handle_events_result';

export type {
  EventPayload,
  HandleEventsHttpResponse,
  HandleEventsResult,
} from './handle_events_result';

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

/**
 * Spoke events contract.
 *
 * `handleEvents` returns emit or HTTP ack. The hub must run
 * `parseHandleEventsResult` (and `validateEmittedEvents` on emit).
 */
export interface ConnectorSpecEvents {
  readonly definitions: Record<string, EventDefinition>;
  handleEvents(ctx: ConnectorIngressContext): Promise<HandleEventsResult>;
}
