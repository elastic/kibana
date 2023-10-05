/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

import {
  extractMigrationInfo,
  getMigrationHash,
  SavedObjectTypeMigrationInfo,
  // TODO: how to resolve this? Where to place this script?
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '@kbn/core-test-helpers-so-type-serializer';
import {
  createTestServers,
  createRootWithCorePlugins,
  // TODO: how to resolve this? Where to place this script?
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '@kbn/core-test-helpers-kbn-server';
import { ToolingLog } from '@kbn/tooling-log';
import { mkdirp } from '../build/lib';

type MigrationInfoRecord = Pick<
  SavedObjectTypeMigrationInfo,
  'name' | 'migrationVersions' | 'schemaVersions' | 'modelVersions'
> & {
  hash: string;
};

type ServerHandles = Awaited<ReturnType<typeof startServers>> | undefined;

/**
 * Starts up ES & Kibana to extract plugin migration information, and save it to @param outputPath.
 * @param log Tooling log handed over from CLI runner
 * @param outputPath Path (absolute or relative to) where the extracted migration info should be saved to in a JSON format.
 */
async function takeSnapshot({ log, outputPath }: { log: ToolingLog; outputPath: string }) {
  let serverHandles: ServerHandles;

  const snapshotOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(getGitRoot(), outputPath);

  try {
    serverHandles = await startServers();

    const typeRegistry = serverHandles.coreStart.savedObjects.getTypeRegistry();
    const allTypes = typeRegistry.getAllTypes();

    const migrationInfoMap = allTypes.reduce((map, type) => {
      // TODO: we don't need to distill the hash here, we can keep more information about the types,
      //  if we can use that for more insights
      const migrationInfo = extractMigrationInfo(type);
      map[type.name] = {
        name: migrationInfo.name,
        migrationVersions: migrationInfo.migrationVersions,
        hash: getMigrationHash(type),
        modelVersions: migrationInfo.modelVersions,
        schemaVersions: migrationInfo.schemaVersions,
      };
      return map;
    }, {} as Record<string, MigrationInfoRecord>);

    await writeSnapshotFile(snapshotOutputPath, migrationInfoMap);
    log.info('Snapshot taken!');

    return migrationInfoMap;
  } finally {
    log.debug('Shutting down servers');
    await shutdown(log, serverHandles);
  }
}

async function startServers() {
  const { startES } = createTestServers({
    adjustTimeout: () => {},
  });

  const esServer = await startES();
  const kibanaRoot = createRootWithCorePlugins({}, { oss: false });
  await kibanaRoot.preboot();
  await kibanaRoot.setup();
  const coreStart = await kibanaRoot.start();
  return { esServer, kibanaRoot, coreStart };
}

async function writeSnapshotFile(
  snapshotOutputPath: string,
  hashMap: Record<string, MigrationInfoRecord>
) {
  const timestamp = Date.now();
  const date = new Date().toISOString();
  const buildUrl = process.env.BUILDKITE_BUILD_URL;
  const prId = process.env.BUILDKITE_MESSAGE?.match(/\(#(\d+)\)/)?.[1];
  const pullRequestUrl = prId ? `https://github.com/elastic/kibana/pulls/${prId}` : null;
  const kibanaCommitHash = process.env.BUILDKITE_COMMIT || getLocalHash();

  await mkdirp(path.dirname(snapshotOutputPath));

  fs.writeFileSync(
    snapshotOutputPath,
    JSON.stringify(
      {
        meta: {
          timestamp,
          date,
          kibanaCommitHash,
          buildUrl,
          pullRequestUrl,
        },
        typeHashes: hashMap,
      },
      null,
      2
    )
  );
}

async function shutdown(log: ToolingLog, serverHandles: ServerHandles) {
  if (!serverHandles) {
    log.debug('No server to terminate.');
    return;
  }

  try {
    await serverHandles.kibanaRoot.shutdown();

    log.info("Kibana's shutdown done!");
  } catch (ex) {
    log.error('Error while stopping kibana.');
    log.error(ex);
  }

  try {
    await serverHandles.esServer.stop();
    log.info('ES Stopped!');
  } catch (ex) {
    log.error('Error while stopping ES.');
    log.error(ex);
  }
}

function getLocalHash() {
  try {
    const stdout = cp.execSync('git rev-parse HEAD');
    return stdout.toString().trim();
  } catch (e) {
    return null;
  }
}

function getGitRoot() {
  try {
    const stdout = cp.execSync('git rev-parse --show-toplevel');
    return stdout.toString().trim();
  } catch (e) {
    return '.';
  }
}

export { takeSnapshot };
