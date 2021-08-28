
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConfigDeprecationProvider } from '@kbn/config';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const deprecations: ConfigDeprecationProvider = ({ unused }) => [unused('fleetMode')];

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    transactionIndices: schema.string({ defaultValue: 'apm-*' }),
    spanIndices: schema.string({ defaultValue: 'apm-*' }),
    errorIndices: schema.string({ defaultValue: 'apm-*' }),
    metricsIndices: schema.string({ defaultValue: 'apm-*' }),
    sourcemapIndices: schema.string({ defaultValue: 'apm-*' }),
    onboardingIndices: schema.string({ defaultValue: 'apm-*' }),
    indexPattern: schema.string({ defaultValue: 'apm-*' }),
    fleetMode: schema.boolean({ defaultValue: true }),
  }),
  deprecations,
};

export type APMOSSConfig = TypeOf<typeof config.schema>;
