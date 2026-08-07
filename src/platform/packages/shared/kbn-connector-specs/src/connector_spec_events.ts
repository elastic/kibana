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
 * Context passed to ConnectorSpecEvents.handleEvents.
 */
export interface ConnectorIngressContext {
  readonly spaceId: string;
  readonly log: Logger;
  readonly connectorId: string;
  readonly connectorTypeId: string;
  readonly config: Record<string, unknown>;
  readonly secrets: Record<string, unknown>;
  readonly rawBody: unknown;
  readonly headers: Record<string, string | string[] | undefined>;
}

export interface EventHttpResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Record<string, string>;
}

export interface EventPayload {
  readonly eventId: string;
  readonly correlationKey: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Result of handleEvents:
 * - `http`: return status/body/headers; do not emit
 * - `emit`: publish each payload (prefer non-empty)
 */
export type HandleEventsResult =
  | { type: 'http'; httpResponse: EventHttpResponse }
  | { type: 'emit'; events: EventPayload[] };

/**
 * Declared event on a connector spec.
 */
export interface EventDefinition {
  readonly eventId: string;
  readonly title: string;
  readonly description: string;
  readonly eventSchema: z.ZodObject;
}

export interface ConnectorSpecEvents {
  readonly definitions: Record<string, EventDefinition>;
  handleEvents(ctx: ConnectorIngressContext): Promise<HandleEventsResult>;
}
