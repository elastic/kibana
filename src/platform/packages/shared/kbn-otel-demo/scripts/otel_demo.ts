/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { ensureOtelDemo } from '../src/ensure_otel_demo';

run(
  ({ log, addCleanupTask, flags }) => {
    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });

    const configPath = flags.config ? String(flags.config) : undefined;
    const logsIndex = flags['logs-index'] ? String(flags['logs-index']) : 'logs';
    const teardown = Boolean(flags.teardown);

    return ensureOtelDemo({
      log,
      signal: controller.signal,
      configPath,
      logsIndex,
      teardown,
    }).catch((error) => {
      throw new Error('Failed to manage OTel Demo', { cause: error });
    });
  },
  {
    description: `
      Start the OpenTelemetry Demo application using Docker Compose and configure it to send
      telemetry data (logs, traces, metrics) to your local Elasticsearch instance.
      
      Reads Elasticsearch connection details from kibana.dev.yml, generates OpenTelemetry 
      Collector configuration with elasticsearchexporter, and starts the OTel Demo containers.
    `,
    flags: {
      string: ['config', 'logs-index'],
      boolean: ['teardown'],
      alias: {
        c: 'config',
      },
      default: {
        'logs-index': 'logs',
      },
      help: `
        --config, -c       Path to Kibana config file (defaults to config/kibana.dev.yml)
        --logs-index       Index name for logs (defaults to "logs")
        --teardown         Stop and remove OTel Demo containers
      `,
    },
  }
);

