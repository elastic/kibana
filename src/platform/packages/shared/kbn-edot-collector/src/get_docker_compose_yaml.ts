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
import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';

const COLLECTOR_IMAGE = 'docker.elastic.co/elastic-agent/elastic-otel-collector';

interface VersionEntry {
  version: string;
  branch: string;
  branchType: 'development' | 'release' | 'unmaintained';
}

async function checkDockerImageExists(version: string, log: ToolingLog): Promise<boolean> {
  try {
    log.debug(`Checking if image exists: ${COLLECTOR_IMAGE}:${version}`);
    await execa.command(`docker manifest inspect ${COLLECTOR_IMAGE}:${version}`, {
      stdio: 'ignore',
      timeout: 10000,
    });
    log.info(`Using image: ${COLLECTOR_IMAGE}:${version} as the latest available version`);
    return true;
  } catch {
    return false;
  }
}

async function getLatestAgentReleaseTag(log: ToolingLog): Promise<string> {
  const currentVersion = kibanaPackageJson.version;

  try {
    const versionsFilePath = Path.join(REPO_ROOT, 'versions.json');
    const versionsContent = Fs.readFileSync(versionsFilePath, 'utf-8');
    const versionsData: { versions: VersionEntry[] } = JSON.parse(versionsContent);

    const releaseVersions = versionsData.versions
      .filter((v) => v.branchType === 'release')
      .map((v) => v.version);

    // Best effort to find the latest image available based on the current semantic version, given the agent doesn't support "latest" tag
    async function findLatestImageAvailable(
      major: number,
      minor: number,
      patch: number
    ): Promise<string | undefined> {
      if (patch < 0) {
        const nextVersion = releaseVersions.find((v) => {
          const parsed = semver.parse(v, {}, true);
          return parsed.major === major && parsed.minor < minor;
        });

        if (!nextVersion) {
          const nextMajorVersion = releaseVersions.find((v) => {
            const parsed = semver.parse(v, {}, true);
            return parsed.major < major;
          });

          if (!nextMajorVersion) {
            return undefined;
          }

          const parsed = semver.parse(nextMajorVersion, {}, true);
          return findLatestImageAvailable(parsed.major, parsed.minor, parsed.patch);
        }

        const parsed = semver.parse(nextVersion, {}, true);
        return findLatestImageAvailable(parsed.major, parsed.minor, parsed.patch);
      }

      const version = `${major}.${minor}.${patch}`;
      const imageExists = await checkDockerImageExists(version, log);

      if (imageExists) {
        return version;
      }

      return findLatestImageAvailable(major, minor, patch - 1);
    }

    const { major, minor, patch } = semver.parse(currentVersion, {}, true);
    const found = await findLatestImageAvailable(major, minor, patch);

    return found || currentVersion;
  } catch (error) {
    return currentVersion;
  }
}

/**
 * Generates a Docker Compose configuration for running the EDOT Collector (Elastic Distribution of OpenTelemetry Collector) in Gateway mode.
 *
 * @param collectorConfigPath - Path to the EDOT Collector configuration file
 * @param grpcPort - Host port for gRPC endpoint (defaults to 4317)
 * @param httpPort - Host port for HTTP endpoint (defaults to 4318)
 * @returns Docker Compose YAML configuration string
 */
export async function getDockerComposeYaml({
  collectorConfigPath,
  grpcPort = 4317,
  httpPort = 4318,
  log,
}: {
  collectorConfigPath: string;
  grpcPort: number;
  httpPort: number;
  log: ToolingLog;
}) {
  const agentVersion = await getLatestAgentReleaseTag(log);
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
          - "${grpcPort}:4317"
          - "${httpPort}:4318"
  `);
}
