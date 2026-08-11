/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yaml from 'js-yaml';

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
 * @returns YAML configuration string for the EDOT Collector
 */
export function getEdotCollectorConfiguration(params: EdotCollectorParams): string {
  return yaml.dump(getEdotCollectorConfig(params));
}
