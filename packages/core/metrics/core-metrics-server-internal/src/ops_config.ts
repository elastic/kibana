/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { Duration } from 'moment';

/** @internal */
export const OPS_CONFIG_PATH = 'ops' as const;

/** @internal */
const OPS_METRICS_INTERVAL = '5s';

/** @internal */
interface OpsConfigCGroupOverridesOps {
  cpuPath?: string;
  cpuAcctPath?: string;
}

/** @internal */
export interface OpsConfigType {
  interval: Duration;
  cGroupOverrides: OpsConfigCGroupOverridesOps;
}

const configSchema = schema.object({
  interval: schema.duration({ defaultValue: OPS_METRICS_INTERVAL }),
  cGroupOverrides: schema.object({
    cpuPath: schema.maybe(schema.string()),
    cpuAcctPath: schema.maybe(schema.string()),
  }),
});

export const opsConfig: ServiceConfigDescriptor<OpsConfigType> = {
  path: OPS_CONFIG_PATH,
  schema: configSchema,
};
