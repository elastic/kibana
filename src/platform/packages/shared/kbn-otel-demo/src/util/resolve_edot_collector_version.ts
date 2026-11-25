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
import { promises as Fs } from 'fs';
import Os from 'os';
import Path from 'path';

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

  // Public image. Docker CLI auto-selects the platform credential helper
  // (osxkeychain, wincred, pass) when the config has no auth settings, so an
  // empty directory can still send a rejected docker.elastic.co login. A
  // placeholder auth entry with no credentials keeps the request on the file
  // store and skips that helper.
  const dockerConfigDir = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'edot-collector-docker-config-'));
  try {
    await Fs.writeFile(
      Path.join(dockerConfigDir, 'config.json'),
      JSON.stringify({ auths: { 'edot-collector.invalid': {} } }),
      'utf8'
    );

    let { major, minor, patch } = current;
    while (major > 0) {
      const version = `${major}.${minor}.${patch}`;
      try {
        await execa.command(`docker manifest inspect ${EDOT_IMAGE}:${version}`, {
          timeout: 10000,
          env: { DOCKER_CONFIG: dockerConfigDir },
        });
        log.debug(`Found EDOT image: ${EDOT_IMAGE}:${version}`);
        return version;
      } catch {
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
  } finally {
    await Fs.rm(dockerConfigDir, { recursive: true, force: true });
  }
}
