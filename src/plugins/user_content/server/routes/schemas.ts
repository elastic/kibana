/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type } from '@kbn/config-schema';

import { metadataEventTypes, MetadataEventType } from '../../common';

export const eventTypeSchema = schema.oneOf(
  metadataEventTypes.map((eventType) => schema.literal(eventType)) as [Type<MetadataEventType>]
);

export const streamEvent = schema.object({
  type: eventTypeSchema,
  soId: schema.string(),
  soType: schema.string(),
});
