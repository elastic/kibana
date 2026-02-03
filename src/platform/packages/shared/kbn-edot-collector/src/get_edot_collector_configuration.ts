/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yaml from 'js-yaml';

/**
 * Generates the OpenTelemetry Collector configuration for the EDOT Collector.
 *
 * @param elasticsearchEndpoint - The Elasticsearch endpoint URL
 * @param username - Elasticsearch username
 * @param password - Elasticsearch password
 * @returns YAML configuration string for the EDOT Collector
 */
export function getEdotCollectorConfiguration({
  elasticsearchEndpoint,
  username,
  password,
}: {
  elasticsearchEndpoint: string;
  username: string;
  password: string;
}): string {
  const config = {
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
      elastictrace: {},
    },
    exporters: {
      elasticsearch: {
        endpoint: elasticsearchEndpoint,
        user: username,
        password,
        mapping: {
          mode: 'otel',
        },
        logs_dynamic_index: {
          enabled: true,
        },
        metrics_dynamic_index: {
          enabled: true,
        },
        traces_dynamic_index: {
          enabled: true,
        },
        flush: {
          interval: '1s',
        },
      },
    },
    service: {
      pipelines: {
        traces: {
          receivers: ['otlp'],
          processors: ['elastictrace'],
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

  return yaml.dump(config);
}
