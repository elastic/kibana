/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import * as os from 'os';
import { basename, dirname, resolve } from 'path';

import type { ToolingLog } from '@kbn/tooling-log';

import { downloadFile, expandGitRev } from '../util';
import type { MigrationInfoRecord, MigrationSnapshot } from '../types';

const SO_MIGRATIONS_BUCKET_PREFIX = 'https://storage.googleapis.com/kibana-so-types-snapshots';

export interface SnapshotComparisonResult {
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

interface CompareSnapshotsParams {
  from: string;
  to: string;
  log: ToolingLog;
  outputPath?: string;
  emitJson?: boolean;
}

export const compareSnapshots = async ({
  outputPath,
  log,
  from,
  to,
  emitJson = false,
}: CompareSnapshotsParams): Promise<SnapshotComparisonResult> => {
  if (!from || !to) {
    throw new Error('"--from" and "--to" must be specified');
  }
  if (from === to) {
    throw new Error('"from" and "to" must be different');
  }

  const fromSnapshotPath = isFile(from) ? from : await downloadSnapshot(from, log);
  const toSnapshotPath = isFile(to) ? to : await downloadSnapshot(to, log);

  const fromSnapshot = await loadSnapshotFromFile(fromSnapshotPath);
  const toSnapshot = await loadSnapshotFromFile(toSnapshotPath);

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
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    log.info(`Output written to: ${outputPath}`);
  } else if (emitJson) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
    log.info(`Emitted result as JSON to stdout... (Use '--quiet' to disable non-parseable output)`);
  }

  return result;
};

/**
 * Compares two snapshots by their per-type migration hashes. This is intentionally
 * hash-based (not deep-equal) — it is a developer convenience tool for spotting type
 * changes between two arbitrary commits, not a strict equality check.
 */
const compareSnapshotFiles = (
  fromSnapshot: MigrationSnapshot,
  toSnapshot: MigrationSnapshot
): SnapshotComparisonResult => {
  const pluginNames = Object.keys(fromSnapshot.typeDefinitions);
  const changedPluginNames = pluginNames.filter(
    (name) => fromSnapshot.typeDefinitions[name].hash !== toSnapshot.typeDefinitions[name]?.hash
  );
  const unchangedPluginNames = pluginNames.filter((name) => !changedPluginNames.includes(name));

  const changes = changedPluginNames.reduce<SnapshotComparisonResult['changes']>(
    (acc, pluginName) => {
      const fromInfo = fromSnapshot.typeDefinitions[pluginName];
      const toInfo = toSnapshot.typeDefinitions[pluginName];
      const fromVersion = Number(fromInfo.modelVersions.at(-1)?.version ?? '0');
      const toVersion = Number(toInfo.modelVersions.at(-1)?.version ?? '0');
      acc[pluginName] = {
        from: fromInfo,
        to: toInfo,
        versionChange: {
          from: fromVersion,
          to: toVersion,
          emoji: Math.abs(fromVersion - toVersion) >= 2 ? '🚨' : '✅',
        },
      };
      return acc;
    },
    {}
  );

  return {
    hasChanges: changedPluginNames.length > 0,
    from: fromSnapshot.meta.kibanaCommitHash,
    to: toSnapshot.meta.kibanaCommitHash,
    changed: changedPluginNames,
    unchanged: unchangedPluginNames,
    changes,
  };
};

const downloadSnapshot = async (gitRev: string, log: ToolingLog): Promise<string> => {
  const fullCommitHash = expandGitRev(gitRev);
  const googleCloudUrl = `${SO_MIGRATIONS_BUCKET_PREFIX}/${fullCommitHash}.json`;
  return downloadToTemp(googleCloudUrl, log);
};

const downloadToTemp = async (googleCloudUrl: string, log: ToolingLog): Promise<string> => {
  const fileName = basename(googleCloudUrl);
  const filePath = resolve(os.tmpdir(), fileName);

  if (existsSync(filePath)) {
    log.info('Snapshot already exists at: ' + filePath);
    return filePath;
  }

  log.info('Downloading snapshot from: ' + googleCloudUrl);
  await downloadFile(googleCloudUrl, filePath);
  log.info('File downloaded: ' + filePath);
  return filePath;
};

const loadSnapshotFromFile = async (filePath: string): Promise<MigrationSnapshot> => {
  try {
    const fileContent = await readFile(filePath, { encoding: 'utf-8' });
    return JSON.parse(fileContent);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Snapshot file not found: ${filePath}`);
    } else if (err.message.includes('Unexpected token')) {
      throw new Error(`Snapshot file is not a valid JSON: ${filePath}`);
    }
    throw err;
  }
};

const isFile = (str: string): boolean => {
  try {
    return existsSync(str);
  } catch {
    return false;
  }
};
