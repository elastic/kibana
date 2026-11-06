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
import { apmConfigSchema } from '@kbn/apm-config-loader';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const elasticConfig = schema.object({
  apm: apmConfigSchema,
});

export type ElasticConfigType = TypeOf<typeof elasticConfig>;

export const elasticApmConfig: ServiceConfigDescriptor<ElasticConfigType> = {
  path: 'elastic',
  schema: elasticConfig,
  deprecations: ({ deprecate }) => [
    deprecate('apm', '10.0.0', {
      level: 'critical',
      message:
        'Elastic APM is deprecated in favor of OpenTelemetry instrumentation and will be removed in 10.0.0. Please migrate to OpenTelemetry.',
      documentationUrl:
        'https://www.elastic.co/docs/extend/kibana/kibana-debugging#_instrumenting_with_otel_traces',
      correctiveActions: {
        manualSteps: [
          'Remove the `elastic.apm` configuration.',
          'Use `telemetry.tracing` and `telemetry.metrics` to configure OpenTelemetry tracing and metrics.',
        ],
      },
    }),
  ],
};
