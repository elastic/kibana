/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import execa from 'execa';
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

  return {
    buildSha: (await execa('git', ['rev-parse', 'HEAD'])).stdout,
    buildVersion,
    buildNumber: await getBuildNumber(),
  };
}
