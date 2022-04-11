/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ShipperName } from '../analytics_client';

/**
 * Definition of the context that can be appended to the events through the {@link IAnalyticsClient.registerContextProvider}.
 */
export interface EventContext {
  /**
   * The unique user ID.
   */
  userId?: string;
  /**
   * The user's organization ID.
   */
  esOrgId?: string;
  /**
   * The product's version.
   */
  version?: string;
  /**
   * The name of the current page.
   * @remarks We need to keep this for backwards compatibility because it was provided by previous implementations of FullStory.
   */
  pageName?: string;
  /**
   * The current page.
   * @remarks We need to keep this for backwards compatibility because it was provided by previous implementations of FullStory.
   */
  page?: string;
  /**
   * The current application ID.
   * @remarks We need to keep this for backwards compatibility because it was provided by previous implementations of FullStory.
   */
  app_id?: string;
  /**
   * The current entity ID.
   * @remarks We need to keep this for backwards compatibility because it was provided by previous implementations of FullStory.
   */
  ent_id?: string;
  // TODO: Extend with known keys
  [key: string]: unknown;
}

/**
 * Event Type used for indexed structures. Only used to improve the readability of the types
 */
export type EventType = string;

/**
 * Types of the Telemetry Counter: It allows to differentiate what happened to the events
 */
export enum TelemetryCounterType {
  /**
   * The event was accepted and will be sent to the shippers when they become available (and opt-in === true).
   */
  enqueued = 'enqueued',
  /**
   * The event was sent to at least one shipper.
   */
  sent_to_shipper = 'sent_to_shipper',
  /**
   * The event was successfully sent by the shipper.
   */
  succeeded = 'succeeded',
  /**
   * There was an error when processing/shipping the event.
   * Refer to the Telemetry Counter's code for the reason.
   */
  failed = 'failed',
  /**
   * The event was dropped from the queue.
   * Refer to the Telemetry Counter's code for the reason.
   */
  dropped = 'dropped',
}

/**
 * Shape of the events emitted by the telemetryCounter$ observable
 */
export interface TelemetryCounter {
  /**
   * Indicates if the event contains data about succeeded, failed or dropped events.
   */
  type: TelemetryCounterType;
  /**
   * Who emitted the event? It can be "client" or the name of the shipper.
   */
  source: 'client' | ShipperName;
  /**
   * The event type the success/failure/drop event refers to.
   */
  event_type: EventType;
  /**
   * Code to provide additional information about the success or failure. Examples are 200/400/504/ValidationError/UnknownError
   */
  code: string;
  /**
   * The number of events that this counter refers to.
   */
  count: number;
}

/**
 * Definition of the full event structure
 */
export interface Event {
  /**
   * The time the event was generated in ISO format.
   */
  timestamp: string;
  /**
   * The event type.
   */
  event_type: EventType;
  /**
   * The specific properties of the event type.
   */
  properties: Record<string, unknown>;
  /**
   * The {@link EventContext} enriched during the processing pipeline.
   */
  context: EventContext;
}
