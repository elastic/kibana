/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

export const TEMPLATE_DIR = resolve(__dirname, '../templates');
export const PKG_TEMPLATE_DIR = resolve(TEMPLATE_DIR, 'package');

export const PKG_DIRS: Record<string, string> = {
  'oss|platform|private': resolve(REPO_ROOT, 'src/platform/packages/private'),
  'oss|platform|shared': resolve(REPO_ROOT, 'src/platform/packages/shared'),
  'xpack|platform|private': resolve(REPO_ROOT, 'x-pack/platform/packages/private'),
  'xpack|platform|shared': resolve(REPO_ROOT, 'x-pack/platform/packages/shared'),
  'xpack|observability|private': resolve(REPO_ROOT, 'x-pack/solutions/observability/packages'),
  'xpack|security|private': resolve(REPO_ROOT, 'x-pack/solutions/security/packages'),
  'xpack|search|private': resolve(REPO_ROOT, 'x-pack/solutions/search/packages'),
};

function folderName(pkgId: string) {
  return pkgId.slice(1).replace('/', '-');
}

export function determineDevPackageDir(pkgId: string) {
  return resolve(REPO_ROOT, 'packages', folderName(pkgId));
}

export function determinePackageDir({
  pkgId,
  group,
  visibility,
  xpack,
}: {
  pkgId: string;
  group: 'observability' | 'platform' | 'security' | 'search';
  visibility: 'private' | 'shared';
  xpack: boolean;
}) {
  const dir = PKG_DIRS[`${xpack ? 'xpack' : 'oss'}|${group}|${visibility}`];
  return resolve(REPO_ROOT, dir, folderName(pkgId));
}
