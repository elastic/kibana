/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType, Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { DrilldownRegistry } from './registry';

export function getDrilldownsSchema(
  registry: DrilldownRegistry,
  embeddableSupportedTriggers: string[]
) {
  return schema.object({
    drilldowns: schema.maybe(
      schema.arrayOf(getDrilldownSchema(registry, embeddableSupportedTriggers))
    ),
  });
}

function getDrilldownSchema(registry: DrilldownRegistry, embeddableSupportedTriggers: string[]) {
  return schema.object({
    config: schema.discriminatedUnion(
      'type',
      registry.getSchemas(embeddableSupportedTriggers) as [ObjectType<{ type: Type<string> }>]
    ),
    label: schema.maybe(schema.string()),
    triggers: schema.arrayOf(
      schema.string({
        minLength: 1, // at least one trigger is required
        maxLength: 100, // arbitrary value
      })
    ),
  });
}
