/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'yaml';

export interface EdotCollectorParams {
  elasticsearchEndpoint: string;
  username: string;
  password: string;
}

/**
 * Returns the EDOT Collector configuration as a plain object.
 * Useful when callers need to extend the config before serializing.
 *
 * @param elasticsearchEndpoint - The Elasticsearch endpoint URL
 * @param username - Elasticsearch username
 * @param password - Elasticsearch password
 */
export function getEdotCollectorConfig({
  elasticsearchEndpoint,
  username,
  password,
}: EdotCollectorParams): Record<string, unknown> {
  return {
    extensions: {
      health_check: {
        endpoint: '0.0.0.0:13133',
      },
    },
    receivers: {
      otlp: {
        protocols: {
          grpc: {
            endpoint: '0.0.0.0:4317',
          },
          http: {
            endpoint: '0.0.0.0:4318',
          },
        },
      },
    },
    connectors: {
      elasticapm: {},
    },
    processors: {
      elasticapm: {},
    },
    exporters: {
      elasticsearch: {
        endpoint: elasticsearchEndpoint,
        user: username,
        password,
        tls: elasticsearchEndpoint.startsWith('https://') ? { insecure_skip_verify: true } : {},
        mapping: {
          mode: 'otel',
        },
      },
    },
    service: {
      extensions: ['health_check'],
      pipelines: {
        traces: {
          receivers: ['otlp'],
          processors: ['elasticapm'],
          exporters: ['elasticapm', 'elasticsearch'],
        },
        metrics: {
          receivers: ['otlp'],
          exporters: ['elasticsearch'],
        },
        'metrics/aggregated': {
          receivers: ['elasticapm'],
          exporters: ['elasticsearch'],
        },
        logs: {
          receivers: ['otlp'],
          exporters: ['elasticapm', 'elasticsearch'],
        },
      },
    },
  };
}

/**
 * Generates the OpenTelemetry Collector configuration for the EDOT Collector.
 *
 * The `yaml-1.1` schema keeps values like a literal `yes` or `0123456` password
 * quoted, so they stay strings for the collector's YAML 1.1 parser rather than
 * being read as a boolean or an octal number. `singleQuote` matches the quoting
 * style the collector config has always been written in.
 *
 * @returns YAML configuration string for the EDOT Collector
 */
export function getEdotCollectorConfiguration(params: EdotCollectorParams): string {
  return stringify(getEdotCollectorConfig(params), { schema: 'yaml-1.1', singleQuote: true });
}
