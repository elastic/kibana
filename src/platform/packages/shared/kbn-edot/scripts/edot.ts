/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { ensureEdot } from '../src/ensure_edot';

run(
  ({ log, addCleanupTask }) => {
    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });

    return ensureEdot({
      log,
      signal: controller.signal,
    }).catch((error) => {
      throw new Error('Failed to start EDOT', { cause: error });
    });
  },
  {
    description: `
      Start EDOT (Elastic Distribution of OpenTelemetry Collector) and connect it to Elasticsearch.
      
      Reads Elasticsearch connection details from kibana.yml and kibana.dev.yml, generates 
      OpenTelemetry Collector configuration, and starts a Docker container to collect host 
      and Docker metrics.
    `,
    flags: {
      string: ['config'],
      alias: {
        c: 'config',
      },
      help: `
        --config, -c       Path to Kibana config file (can be specified multiple times)
      `,
    },
  }
);
