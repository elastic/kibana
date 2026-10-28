/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const coreConfigSchema = schema.object({
  lifecycle: schema.object({
    disablePreboot: schema.boolean({ defaultValue: false }),
  }),
  /**
   * If the config validation fails, this setting allows retrying it with `stripUnknownKeys: true`, which removes any
   * unknown config keys from the resulting validated config object.
   *
   * This is an escape hatch that should be used only
   * if necessary. The setting is expected to be false in the classic offering and during dev and CI times.
   * However, on Serverless, we'd like to set it to true to avoid bootlooping in case of any temporary misalignment
   * between our kibana-controller and the Kibana versions.
   */
  enableStripUnknownConfigWorkaround: schema.boolean({ defaultValue: false }),
  /**
   * Backend for `core.remote`. Workflows register a graph; they do not choose this value.
   * `worker_thread` is the proof backend. `in_process` runs the same graph on the coordinator
   * and does not isolate the event loop.
   */
  remote: schema.object({
    backend: schema.oneOf([schema.literal('worker_thread'), schema.literal('in_process')], {
      defaultValue: 'worker_thread',
    }),
  }),
});

export type CoreConfigType = TypeOf<typeof coreConfigSchema>;

export const coreConfig: ServiceConfigDescriptor<CoreConfigType> = {
  path: 'core',
  schema: coreConfigSchema,
};
