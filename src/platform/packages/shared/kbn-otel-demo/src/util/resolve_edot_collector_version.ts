/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

const EDOT_IMAGE = 'docker.elastic.co/elastic-agent/elastic-otel-collector';

/**
 * Resolves the latest available EDOT Collector image version by walking back
 * from the current Kibana version (patch first, then minor, then major).
 * Example: 9.1.2 → 9.1.1 → 9.1.0 → 9.0.0 → 8.20.0 → …
 */
export async function resolveEdotCollectorVersion(log: ToolingLog): Promise<string> {
  const { kibanaPackageJson } = await import('@kbn/repo-info');
  const semver = await import('semver');
  const current = semver.parse(kibanaPackageJson.version.replace(/-SNAPSHOT$/, ''));
  if (!current) {
    return kibanaPackageJson.version.replace(/-SNAPSHOT$/, '');
  }

  let { major, minor, patch } = current;
  while (major > 0) {
    const version = `${major}.${minor}.${patch}`;
    try {
      await execa.command(`docker manifest inspect ${EDOT_IMAGE}:${version}`, {
        timeout: 10000,
      });
      log.debug(`Found EDOT image: ${EDOT_IMAGE}:${version}`);
      return version;
    } catch (error) {
      if (isRejectedElasticRegistryLogin(error)) {
        throw new Error(
          [
            'docker manifest inspect failed with HTTP 500 from docker.elastic.co.',
            'The saved registry login is being rejected, so every tag looks missing.',
            'This login is separate from Docker Desktop.',
            'Refresh it with GitHub SSO:',
            '  docker logout docker.elastic.co',
            '  Sign in at https://docker-auth.elastic.co/github_auth with a GitHub account in the elastic organization.',
            '  docker login docker.elastic.co',
            'Use the username and password shown on that page.',
            'Logging out is enough for public images such as elastic-otel-collector.',
          ].join('\n')
        );
      }
      log.debug(`Image ${EDOT_IMAGE}:${version} not found, trying older version...`);
    }

    if (patch > 0) {
      patch--;
    } else if (minor > 0) {
      minor--;
      patch = 0;
    } else {
      major--;
      // Arbitrary upper bound for minor versions when crossing a major boundary.
      // EDOT Collector releases may lag behind Kibana, so we probe a wide range.
      minor = 20;
      patch = 0;
    }
  }

  const fallback = kibanaPackageJson.version.replace(/-SNAPSHOT$/, '');
  log.warning(`Could not find any EDOT Collector image, falling back to ${fallback}`);
  return fallback;
}

function isRejectedElasticRegistryLogin(error: unknown): boolean {
  const text = registryFailureText(error);
  return text.includes('unexpected HTTP status: 500');
}

function registryFailureText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const withOutput = error as Error & { stderr?: unknown; stdout?: unknown };
  return [error.message, withOutput.stderr, withOutput.stdout]
    .filter((part): part is string => typeof part === 'string')
    .join('\n');
}
