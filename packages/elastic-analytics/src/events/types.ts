/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface EventContext {
  // TODO: Extend with known keys
  [key: string]: unknown;
}

/**
 * Shape of the events emitted by the telemetryCounter$ observable
 */
export interface TelemetryCounter {
  /**
   * Indicates if the event contains data about succeeded, failed or dropped events.
   */
  type: 'enqueued' | 'sent_to_shipper' | 'succeed' | 'failed' | 'dropped';
  /**
   * Who emitted the event? It can be "client" or the name of the shipper.
   */
  source: 'client' | string;
  /**
   * The event type the success/failure/drop event refers to.
   */
  event_type: string;
  /**
   * Code to provide additional information about the success or failure. Examples are 200/400/504/ValidationError/UnknownError
   */
  code: string;
  /**
   * The number of events that met this event.
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
  event_type: string;
  /**
   * The specific properties of the event type.
   */
  properties: Record<string, unknown>;
  /**
   * The {@link EventContext} enriched during the processing pipeline.
   */
  context: EventContext;
}
