/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import fs from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getBuildNumber } from './get_build_number';

interface Options {
  isRelease: boolean;
  versionQualifier?: string;
  pkg: {
    version: string;
  };
}

type ResolvedType<T extends Promise<any>> = T extends Promise<infer X> ? X : never;

export type VersionInfo = ResolvedType<ReturnType<typeof getVersionInfo>>;

export async function getVersionInfo({ isRelease, versionQualifier, pkg }: Options) {
  const buildVersion = pkg.version.concat(
    versionQualifier ? `-${versionQualifier}` : '',
    isRelease ? '' : '-SNAPSHOT'
  );

  const buildSha = fs.existsSync(join(REPO_ROOT, '.git'))
    ? (await execa('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT })).stdout
    : process.env.GIT_COMMIT || process.env.BUILDKITE_COMMIT || '';

  return {
    buildSha,
    buildShaShort: buildSha.slice(0, 12),
    buildVersion,
    buildNumber: await getBuildNumber(),
    buildDate: new Date().toISOString(),
  };
}
