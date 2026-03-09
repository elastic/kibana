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
  triggerId: string;
  spaceId: string;
  subscriptions: string[];
  payload: Record<string, unknown>;
}

export async function writeTriggerEvent(
  client: TriggerEventsDataStreamClient,
  params: WriteTriggerEventParams
): Promise<void> {
  const doc = {
    '@timestamp': params.timestamp,
    triggerId: params.triggerId,
    spaceId: params.spaceId,
    subscriptions: params.subscriptions,
    payload: params.payload,
  };
  await client.create({
    documents: [doc],
  });
}
