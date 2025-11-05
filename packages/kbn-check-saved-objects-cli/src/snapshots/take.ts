/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as cp from 'child_process';

import { extractMigrationInfo, getMigrationHash } from '@kbn/core-test-helpers-so-type-serializer';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  MigrationInfoRecord,
  MigrationSnapshot,
  MigrationSnapshotMeta,
  ServerHandles,
} from '../types';

/**
 * Extracts plugin migration information using provided server handles.
 * @param log Tooling log handed over from CLI runner
 * @param serverHandles Handles for running ES & Kibana servers
 */
export async function takeSnapshot({
  log,
  serverHandles,
}: {
  log: ToolingLog;
  serverHandles: ServerHandles;
}): Promise<MigrationSnapshot> {
  try {
    log.info(`Capturing current SO type definitions`);
    const { coreStart } = serverHandles;
    const typeRegistry = coreStart.savedObjects.getTypeRegistry();
    const allTypes = typeRegistry.getAllTypes();

    const migrationInfoMap = allTypes.reduce<Record<string, MigrationInfoRecord>>((map, type) => {
      const migrationInfo = extractMigrationInfo(type);
      map[type.name] = {
        name: migrationInfo.name,
        migrationVersions: migrationInfo.migrationVersions,
        hash: getMigrationHash(type),
        modelVersions: migrationInfo.modelVersions,
        schemaVersions: migrationInfo.schemaVersions,
        mappings: migrationInfo.mappings,
      };
      return map;
    }, {});

    return {
      meta: collectSnapshotMeta(),
      typeDefinitions: migrationInfoMap,
    };
  } catch (err) {
    log.error(
      '⚠️ Failed to obtain snapshot for current working tree. Skipping Saved Objects checks.'
    );
    log.error(err);
    throw err;
  }
}

function collectSnapshotMeta(): MigrationSnapshotMeta {
  const timestamp = Date.now();
  const date = new Date().toISOString();
  const buildUrl = process.env.BUILDKITE_BUILD_URL || null;
  const prId = process.env.BUILDKITE_MESSAGE?.match(/\(#(\d+)\)/)?.[1];
  const pullRequestUrl = prId ? `https://github.com/elastic/kibana/pulls/${prId}` : null;
  const kibanaCommitHash = process.env.BUILDKITE_COMMIT || getLocalHash() || 'unknown';

  return {
    timestamp,
    date,
    kibanaCommitHash,
    buildUrl,
    pullRequestUrl,
  };
}

function getLocalHash() {
  try {
    const stdout = cp.execSync('git rev-parse HEAD');
    return stdout.toString().trim();
  } catch (e) {
    return null;
  }
}
