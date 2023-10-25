/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { readFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { basename, dirname, resolve } from 'path';
import { writeFileSync } from 'fs';
import { MigrationInfoRecord, MigrationSnapshot } from './types';

const SO_MIGRATIONS_SNAPSHOT_FOLDER = 'kibana-so-types-snapshots';

interface CompareSnapshotsParameters {
  from: string;
  to: string;
  log: ToolingLog;
  outputPath?: string;
}

async function compareSnapshots({
  outputPath,
  log,
  from,
  to,
}: CompareSnapshotsParameters): Promise<any> {
  validateInput({
    from,
    to,
  });

  const fromSnapshotPath = isCommitHash(from) ? await downloadSnapshot(from, log) : from;
  const toSnapshotPath = isCommitHash(to) ? await downloadSnapshot(to, log) : to;

  const fromSnapshot = await loadJson(fromSnapshotPath);
  const toSnapshot = await loadJson(toSnapshotPath);

  const result = compareSnapshotFiles(fromSnapshot, toSnapshot);

  if (outputPath) {
    log.info(`Snapshots compared: ${from} <=> ${to}`);
    writeSnapshot(outputPath, result);
    log.info(`Output written to: ${outputPath}`);
  } else {
    log.info(`Snapshots compared: ${from} <=> ${to}`);
    log.info(
      `Emitting result to STDOUT... (Enable '--silent' or '--quiet' to disable non-parseable output)`
    );
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

function validateInput({ from, to }: { from: string; to: string }) {
  if (!from || !to) {
    throw new Error('"--from" and "--to" must be specified');
  }

  if (from === to) {
    throw new Error('"from" and "to" must be different');
  }

  if (!isCommitHash(from) && !isUrl(from) && !isFilePath(from)) {
    throw new Error(
      'Invalid "--from" argument. Must be a full commit hash, a URL or an existent file path'
    );
  }

  if (!isCommitHash(to) && !isUrl(to) && !isFilePath(to)) {
    throw new Error(
      'Invalid "--to" argument. Must be a full commit hash, a URL or an existent file path'
    );
  }
}

function writeSnapshot(outputPath: string, result: any) {
  const json = JSON.stringify(result, null, 2);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json);
}

function isCommitHash(str: string) {
  return /^[a-f0-9]+$/.test(str);
}

function isUrl(str: string) {
  return /^https?:\/\//.test(str);
}

function isFilePath(str: string) {
  return existsSync(str);
}

async function downloadToTemp(googleCloudUrl: string): Promise<string> {
  const fileName = basename(googleCloudUrl);
  const filePath = resolve(os.tmpdir(), fileName);

  if (existsSync(filePath)) {
    return filePath;
  } else {
    execSync(`gsutil cp ${googleCloudUrl} ${filePath}`);
    return filePath;
  }
}

async function downloadSnapshot(commitHash: string, log: ToolingLog): Promise<string> {
  const fullCommitHash = expandCommitHash(commitHash);
  const googleCloudUrl = `gs://${SO_MIGRATIONS_SNAPSHOT_FOLDER}/${fullCommitHash}.json`;

  log.info('Downloading snapshot from: ' + googleCloudUrl);
  const filePath = await downloadToTemp(googleCloudUrl);
  log.info('Downloaded snapshot to: ' + filePath);

  return filePath;
}

function expandCommitHash(commitHash: string) {
  if (commitHash.length < 40) {
    return execSync(`git rev-parse ${commitHash}`).toString().trim();
  } else {
    return commitHash;
  }
}

/**
 * Collects all plugin names that have different hashes in the two snapshots.
 * @param fromSnapshot
 * @param toSnapshot
 */
function compareSnapshotFiles(fromSnapshot: MigrationSnapshot, toSnapshot: MigrationSnapshot) {
  const pluginNames = Object.keys(fromSnapshot.typeDefinitions);
  const pluginNamesWithChangedHash = pluginNames.filter((pluginName) => {
    const fromHash = fromSnapshot.typeDefinitions[pluginName].hash;
    const toHash = toSnapshot.typeDefinitions[pluginName].hash;
    return fromHash !== toHash;
  });

  const restOfPluginNames = pluginNames.filter((e) => !pluginNamesWithChangedHash.includes(e));

  const changes = pluginNamesWithChangedHash.reduce((changesObj, pluginName) => {
    const fromMigrationInfo = fromSnapshot.typeDefinitions[pluginName];
    const toMigrationInfo = toSnapshot.typeDefinitions[pluginName];
    changesObj[pluginName] = {
      from: fromMigrationInfo,
      to: toMigrationInfo,
    };
    return changesObj;
  }, {} as Record<string, { from: MigrationInfoRecord; to: MigrationInfoRecord }>);

  return {
    hasChanges: pluginNamesWithChangedHash.length > 0,
    from: fromSnapshot.meta.kibanaCommitHash,
    to: toSnapshot.meta.kibanaCommitHash,
    changed: pluginNamesWithChangedHash,
    unchanged: restOfPluginNames,
    changes,
  };
}

async function loadJson(filePath: string) {
  try {
    const fileContent = await readFile(filePath, { encoding: 'utf-8' });
    return JSON.parse(fileContent);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Snapshot file not found: ${filePath}`);
    } else if (err.message.includes('Unexpected token')) {
      throw new Error(`Snapshot file is not a valid JSON: ${filePath}`);
    } else {
      throw err;
    }
  }
}

export { compareSnapshots };
