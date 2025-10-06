/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

/**
 * Generates a Docker Compose configuration for running the EDOT Collector (Elastic Distribution of OpenTelemetry Collector) in Gateway mode.
 *
 * @param collectorConfigPath - Path to the EDOT Collector configuration file
 * @returns Docker Compose YAML configuration string
 */
export function getDockerComposeYaml({ collectorConfigPath }: { collectorConfigPath: string }) {
  return dedent(`
    services:
      otel-collector:
        image: docker.elastic.co/elastic-agent/elastic-otel-collector:9.0.0
        container_name: kibana-dev-edot-collector
        restart: unless-stopped
        command: ["--config", "/etc/otelcol-config.yml"]
        volumes:
          - ${collectorConfigPath}:/etc/otelcol-config.yml:ro
        ports:
          - "4317:4317"
          - "4318:4318"
  `);
}
