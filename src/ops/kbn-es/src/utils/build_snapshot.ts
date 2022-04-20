/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import os from 'os';

import { withProcRunner } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

import { createCliError } from '../errors';
import { findMostRecentlyChanged } from './find_most_recently_changed';
import { GRADLE_BIN } from '../paths';

interface BuildSnapshotOptions {
  license: string;
  sourcePath: string;
  log: ToolingLog;
  platform?: string;
}

/**
 * Creates archive from source
 *
 * Gradle tasks:
 *   $ ./gradlew tasks --all | grep 'distribution.*assemble\s'
 *   :distribution:archives:darwin-tar:assemble
 *   :distribution:archives:linux-tar:assemble
 *   :distribution:archives:windows-zip:assemble
 *   :distribution:archives:oss-darwin-tar:assemble
 *   :distribution:archives:oss-linux-tar:assemble
 *   :distribution:archives:oss-windows-zip:assemble
 */
export async function buildSnapshot({
  license,
  sourcePath,
  log,
  platform = os.platform(),
}: BuildSnapshotOptions) {
  const { task, ext } = exports.archiveForPlatform(platform, license);
  const buildArgs = [`:distribution:archives:${task}:assemble`];

  log.info('%s %s', GRADLE_BIN, buildArgs.join(' '));
  log.debug('cwd:', sourcePath);

  await withProcRunner(log, async (procs) => {
    await procs.run('gradle', {
      cmd: GRADLE_BIN,
      args: buildArgs,
      cwd: sourcePath,
      wait: true,
    });
  });

  const archivePattern = `distribution/archives/${task}/build/distributions/elasticsearch-*.${ext}`;
  const esArchivePath = findMostRecentlyChanged(path.resolve(sourcePath, archivePattern));

  if (!esArchivePath) {
    throw createCliError('could not locate ES distribution');
  }

  return esArchivePath;
}

export function archiveForPlatform(platform: NodeJS.Platform, license: string) {
  const taskPrefix = license === 'oss' ? 'oss-' : '';

  switch (platform) {
    case 'darwin':
      return { format: 'tar', ext: 'tar.gz', task: `${taskPrefix}darwin-tar`, platform: 'darwin' };
    case 'win32':
      return { format: 'zip', ext: 'zip', task: `${taskPrefix}windows-zip`, platform: 'windows' };
    case 'linux':
      return { format: 'tar', ext: 'tar.gz', task: `${taskPrefix}linux-tar`, platform: 'linux' };
    default:
      throw new Error(`unsupported platform: ${platform}`);
  }
}
