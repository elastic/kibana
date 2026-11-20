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

/**
 * A spoke event passed to the topic helper.
 * `name` is the event id (`github.push`), not a `connectors.` prefix.
 * A spec entry passes its `eventId` as `name`.
 */
export interface ConnectorEventTopicDefinition<
  TSchema extends z.ZodObject = z.ZodObject,
  TName extends string = string
> {
  readonly name: TName;
  readonly eventSchema: TSchema;
}

/** Data published on a connector event topic: the spoke payload plus the hub fields. */
export type ConnectorEventBusData<TSchema extends z.ZodObject> = z.infer<
  ReturnType<typeof connectorEventSchema<TSchema['shape']>>
>;
