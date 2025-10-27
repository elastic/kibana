/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import semver from 'semver';
import { kibanaPackageJson, REPO_ROOT } from '@kbn/repo-info';
import Fs from 'fs';
import Path from 'path';

interface VersionEntry {
  version: string;
  branch: string;
  branchType: 'development' | 'release' | 'unmaintained';
}

function getLatestAgentReleaseTag(): string {
  const currentVersion = kibanaPackageJson.version;

  try {
    const versionsFilePath = Path.join(REPO_ROOT, 'versions.json');
    const versionsContent = Fs.readFileSync(versionsFilePath, 'utf-8');
    const versionsData: { versions: VersionEntry[] } = JSON.parse(versionsContent);

    const releaseVersions = versionsData.versions
      .filter((v) => v.branchType === 'release')
      .map((v) => v.version);

    const { major: currentMajor, minor: currentMinor } = semver.parse(currentVersion, {}, true);

    const matchingMinor = releaseVersions.find((version) => {
      const { major, minor } = semver.parse(version, {}, true);
      return major === currentMajor && minor === currentMinor;
    });

    if (matchingMinor) {
      return matchingMinor;
    }

    return releaseVersions[0];
  } catch (error) {
    return currentVersion;
  }
}

/**
 * Generates a Docker Compose configuration for running the EDOT Collector (Elastic Distribution of OpenTelemetry Collector) in Gateway mode.
 *
 * @param collectorConfigPath - Path to the EDOT Collector configuration file
 * @returns Docker Compose YAML configuration string
 */
export function getDockerComposeYaml({ collectorConfigPath }: { collectorConfigPath: string }) {
  const agentVersion = getLatestAgentReleaseTag();
  return dedent(`
    services:
      otel-collector:
        image: docker.elastic.co/elastic-agent/elastic-otel-collector:${agentVersion}
        container_name: kibana-edot-collector
        restart: unless-stopped
        command: ["--config", "/etc/otelcol-config.yml"]
        volumes:
          - ${collectorConfigPath}:/etc/otelcol-config.yml:ro
        ports:
          - "4317:4317"
          - "4318:4318"
  `);
}
