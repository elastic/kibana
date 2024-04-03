/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { readFile } from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { basename, dirname, resolve } from 'path';
import { MigrationInfoRecord, MigrationSnapshot } from './types';
import { downloadFile } from './util/download_file';

const SO_MIGRATIONS_BUCKET_PREFIX = 'https://storage.googleapis.com/kibana-so-types-snapshots';

interface CompareSnapshotsParameters {
  from: string;
  to: string;
  log: ToolingLog;
  outputPath?: string;
  emitJson?: boolean;
}

interface SnapshotComparisonResult {
  hasChanges: boolean;
  from: string;
  to: string;
  changed: string[];
  unchanged: string[];
  changes: {
    [pluginName: string]: {
      from: MigrationInfoRecord;
      to: MigrationInfoRecord;
      versionChange: { from: number; to: number; emoji: string };
    };
  };
}

async function compareSnapshots({
  outputPath,
  log,
  from,
  to,
  emitJson = false,
}: CompareSnapshotsParameters): Promise<SnapshotComparisonResult> {
  validateInput({
    from,
    to,
  });

  const fromSnapshotPath = isFile(from) ? from : await downloadSnapshot(from, log);
  const toSnapshotPath = isFile(to) ? to : await downloadSnapshot(to, log);

  const fromSnapshot = await loadJson(fromSnapshotPath);
  const toSnapshot = await loadJson(toSnapshotPath);

  const result = compareSnapshotFiles(fromSnapshot, toSnapshot);

  if (result.hasChanges) {
    log.info(`Snapshots compared: ${from} <=> ${to}. Changed: ${result.changed.join(', ')}`);
    result.changed.forEach((pluginName) => {
      const { versionChange } = result.changes[pluginName];
      log.info(
        `${versionChange.emoji} ${pluginName}: ${versionChange.from} => ${versionChange.to}`
      );
    });
  } else {
    log.info(`Snapshots compared: ${from} <=> ${to}. No changes`);
  }

  if (outputPath) {
    writeSnapshot(outputPath, result);
    log.info(`Output written to: ${outputPath}`);
  } else if (emitJson) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
    log.info(`Emitted result as JSON to stdout... (Use '--quiet' to disable non-parseable output)`);
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
}

function writeSnapshot(outputPath: string, result: any) {
  const json = JSON.stringify(result, null, 2);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json);
}

function isFile(str: string) {
  try {
    return existsSync(str);
  } catch (err) {
    return false;
  }
}

async function downloadToTemp(googleCloudUrl: string, log: ToolingLog): Promise<string> {
  const fileName = basename(googleCloudUrl);
  const filePath = resolve(os.tmpdir(), fileName);

  if (existsSync(filePath)) {
    log.info('Snapshot already exists at: ' + filePath);
    return filePath;
  } else {
    try {
      log.info('Downloading snapshot from: ' + googleCloudUrl);
      await downloadFile(googleCloudUrl, filePath);
      log.info('File downloaded: ' + filePath);
      return filePath;
    } catch (err) {
      log.error("Couldn't download snapshot from: " + googleCloudUrl);
      throw err;
    }
  }
}

function downloadSnapshot(gitRev: string, log: ToolingLog): Promise<string> {
  const fullCommitHash = expandGitRev(gitRev);
  const googleCloudUrl = `${SO_MIGRATIONS_BUCKET_PREFIX}/${fullCommitHash}.json`;

  return downloadToTemp(googleCloudUrl, log);
}

function expandGitRev(gitRev: string) {
  if (gitRev.match(/^[0-9a-f]{40}$/)) {
    return gitRev;
  } else {
    try {
      return execSync(`git rev-parse ${gitRev}`, { stdio: ['pipe', 'pipe', null] })
        .toString()
        .trim();
    } catch (err) {
      throw new Error(`Couldn't expand git rev: ${gitRev} - ${err.message}`);
    }
  }
}

/**
 * Collects all plugin names that have different hashes in the two snapshots.
 * @param fromSnapshot
 * @param toSnapshot
 */
function compareSnapshotFiles(
  fromSnapshot: MigrationSnapshot,
  toSnapshot: MigrationSnapshot
): SnapshotComparisonResult {
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
    const fromVersion = Number(fromMigrationInfo.modelVersions.at(-1)?.version || '0');
    const toVersion = Number(toMigrationInfo.modelVersions.at(-1)?.version || '0');
    changesObj[pluginName] = {
      from: fromMigrationInfo,
      to: toMigrationInfo,
      versionChange: {
        from: fromVersion,
        to: toVersion,
        emoji: Math.abs(fromVersion - toVersion) >= 2 ? '🚨' : '✅',
      },
    };
    return changesObj;
  }, {} as SnapshotComparisonResult['changes']);

  return {
    hasChanges: pluginNamesWithChangedHash.length > 0,
    from: fromSnapshot.meta.kibanaCommitHash!,
    to: toSnapshot.meta.kibanaCommitHash!,
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
