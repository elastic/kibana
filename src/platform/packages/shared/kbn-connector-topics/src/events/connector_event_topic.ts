/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

import type { connectorEventSchema } from './connector_event_schema';

const CONNECTOR_EVENT_TOPIC_PREFIX = 'connectors.' as const;

/** Pubsub topic name for a connector event id (`connectors.github.push`). */
export type ConnectorEventTopicName<TEventId extends string = string> =
  `${typeof CONNECTOR_EVENT_TOPIC_PREFIX}${TEventId}`;

/** Returns the pubsub topic name for a connector event id. */
export const getConnectorEventTopicName = <TEventId extends string>(
  eventId: TEventId
): ConnectorEventTopicName<TEventId> => `${CONNECTOR_EVENT_TOPIC_PREFIX}${eventId}`;

/**
 * A spoke event passed to the topic helper.
 * `name` is the event id (`github.push`). Specs and workflow triggers keep that id.
 * The bus topic name is {@link ConnectorEventTopicName}: `connectors.` plus the event id.
 * A spec entry passes its `eventId` as `name`.
 */
export interface ConnectorEventTopicDefinition<
  TSchema extends z.ZodObject = z.ZodObject,
  TName extends string = string,
> {
  readonly name: TName;
  readonly eventSchema: TSchema;
}

/** Data published on a connector event topic: the spoke payload plus the hub fields. */
export type ConnectorEventBusData<TSchema extends z.ZodObject> = z.infer<
  ReturnType<typeof connectorEventSchema<TSchema['shape']>>
>;
