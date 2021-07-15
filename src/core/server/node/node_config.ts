/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

const workersSchema = schema.object({
  // TODO: default should be `num cpus - 1`
  count: schema.number(),
  max_old_space_size: schema.maybe(schema.byteSize()),
});

/** @internal */
export type WorkersConfigType = TypeOf<typeof workersSchema>;

/** @internal */
export type WorkerConfig = Omit<WorkersConfigType, 'count'> & { worker_type: string };

const coordinatorSchema = schema.maybe(
  schema.object({
    max_old_space_size: schema.maybe(schema.byteSize()),
  })
);

export const config = {
  path: 'node',
  schema: schema.object({
    // Eventually the goal is to enable this by default
    enabled: schema.boolean({ defaultValue: false }),
    // TODO: determine strategy for when/if to support this.
    // It will add complexity as we'd probably need to spawn an
    // intermediary process before starting up the actual coordinator.
    coordinator: coordinatorSchema,
    workers: schema.oneOf([
      workersSchema,
      schema.mapOf(schema.string(), workersSchema, {
        defaultValue: new Map<string, WorkersConfigType>(),
      }),
    ]),
  }),
};

export type NodeConfigType = TypeOf<typeof config.schema>;
