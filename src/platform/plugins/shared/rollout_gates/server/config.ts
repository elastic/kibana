/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { MAX_GATE_ID_LENGTH } from './lib/constants';

const configSchema = schema.object({
  dev: schema.object(
    {
      /**
       * Overrides the build number used to resolve gate phases, and forces the plugin to
       * treat the current process as a real build worth recording. Only takes effect when
       * Kibana is NOT running from a distributable (`packageInfo.dist === false`), so it
       * cannot affect a real release; it exists to simulate a sequence of builds from the
       * command line (and in integration tests) without building a distributable each time.
       */
      buildNum: schema.maybe(schema.number()),
      /**
       * Extra gate ids to auto-declare at startup, so `GET /internal/rollout_gates/{id}` can
       * be exercised for gates that no plugin has declared yet. Same dist-only restriction as
       * `buildNum`: see above.
       */
      gates: schema.arrayOf(schema.string({ maxLength: MAX_GATE_ID_LENGTH }), {
        defaultValue: [],
      }),
    },
    { defaultValue: { gates: [] } }
  ),
});

export type RolloutGatesConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<RolloutGatesConfig> = {
  schema: configSchema,
};
