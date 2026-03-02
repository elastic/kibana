/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

const SERVICE_NAME = 'synth-traces-service';
const ENVIRONMENT = 'production';

export function simpleTrace({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const instance = apm
    .service({ name: SERVICE_NAME, environment: ENVIRONMENT, agentName: 'nodejs' })
    .instance('instance-1');

  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: 'GET /api/data' })
        .timestamp(timestamp)
        .duration(500)
        .success()
        .children(
          instance
            .span({ spanName: 'SELECT * FROM data', spanType: 'db', spanSubtype: 'postgresql' })
            .timestamp(timestamp)
            .duration(200)
            .success()
            .destination('postgresql')
        )
    );
}
