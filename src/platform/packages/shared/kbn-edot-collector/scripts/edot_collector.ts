/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { ensureEdotCollector } from '../src/ensure_edot_collector';

run(
  ({ log, addCleanupTask, flags }) => {
    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });
    const configPath = flags.config ? String(flags.config) : undefined;
    const grpcPort = flags['grpc-port'] ? Number(flags['grpc-port']) : undefined;
    const httpPort = flags['http-port'] ? Number(flags['http-port']) : undefined;

    if (grpcPort !== undefined && (isNaN(grpcPort) || grpcPort < 1 || grpcPort > 65535)) {
      throw new Error('Invalid --grpc-port value. Must be a number between 1 and 65535.');
    }

    if (httpPort !== undefined && (isNaN(httpPort) || httpPort < 1 || httpPort > 65535)) {
      throw new Error('Invalid --http-port value. Must be a number between 1 and 65535.');
    }

    return ensureEdotCollector({
      log,
      signal: controller.signal,
      configPath,
      grpcPort,
      httpPort,
    }).catch((error) => {
      throw new Error('Failed to start EDOT Collector', { cause: error });
    });
  },
  {
    description: `
      Start EDOT Collector (Elastic Distribution of OpenTelemetry Collector) as a Gateway and connect it to Elasticsearch.
      
      Reads Elasticsearch connection details from kibana.dev.yml, generates OpenTelemetry Collector configuration, 
      and starts a Docker container running the EDOT Collector.
    `,
    flags: {
      string: ['config', 'grpc-port', 'http-port'],
      alias: {
        c: 'config',
      },
      help: `
        --config, -c       Path to Kibana config file (defaults to config/kibana.dev.yml)
        --grpc-port        Host port for gRPC endpoint (defaults to 4317)
        --http-port        Host port for HTTP endpoint (defaults to 4318)
      `,
    },
  }
);
