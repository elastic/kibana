/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggerEventsDataStreamClient } from './trigger_events_data_stream';

export interface WriteTriggerEventParams {
  timestamp: string;
  /** Unique id for this trigger dispatch (correlates audit doc and scheduled executions). */
  eventId: string;
  triggerId: string;
  spaceId: string;
  subscriptions: string[];
  payload: Record<string, unknown>;
  sourceExecutionId?: string;
}

export async function writeTriggerEvent(
  client: TriggerEventsDataStreamClient,
  params: WriteTriggerEventParams
): Promise<void> {
  const doc = {
    '@timestamp': params.timestamp,
    eventId: params.eventId,
    triggerId: params.triggerId,
    spaceId: params.spaceId,
    subscriptions: params.subscriptions,
    payload: params.payload,
    ...(params.sourceExecutionId !== undefined && params.sourceExecutionId !== ''
      ? { sourceExecutionId: params.sourceExecutionId }
      : {}),
  };
  await client.create({
    documents: [doc],
  });
}
