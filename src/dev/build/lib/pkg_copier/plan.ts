/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { makeMatcher } from '@kbn/picomatcher/make_matcher';
import type { Package } from '@kbn/repo-packages';

export interface CopyRecord {
  kind: 'copy';
  srcAbs: string;
  destAbs: string;
  srcMode: number;
}
export interface TransformRecord {
  kind: 'transformJs' | 'transformPeggy' | 'transformText' | 'transformYaml';
  srcAbs: string;
  destAbs: string;
}
export type Record = CopyRecord | TransformRecord;

export interface Batch {
  pkgId: string;
  pkgSrcPath: string;
  pkgDistPath: string;
  records: Record[];
}

const EXCLUDED_FILE_NAMES: readonly string[] = [
  'package.json',
  'tsconfig.json',
  '.gitignore',
  'webpack.config.js',
];

const EXCLUDED_FILE_TAGS: readonly string[] = [
  'mock',
  'mocks',
  'test',
  'tests',
  'story',
  'stories',
  'jest',
  'README',
  'readme',
  'test_setup',
  'jest_setup',
];

const EXCLUDED_DIR_RELS: readonly string[] = ['scripts'];

const EXCLUDED_DIR_NAMES: readonly string[] = [
  '__fixtures__',
  '__jest__',
  '__mocks__',
  '__snapshots__',
  '__tests__',
  'cypress',
  'dev_docs',
  'docs',
  'e2e',
  'fixtures',
  'ftr_e2e',
  'integration_tests',
  'manual_tests',
  'mock_responses',
  'mocks',
  '.storybook',
  'storybook',
  'target',
  'test_data',
  'test_fixtures',
  'test_helpers',
  'test_resources',
  'test',
  'tests',
];

function excludeFileByName(name: string) {
  return EXCLUDED_FILE_NAMES.includes(name) || name.endsWith('.d.ts');
}

function excludeFileByTags(tags: readonly string[]) {
  return tags.some((t) => EXCLUDED_FILE_TAGS.includes(t));
}

function excludeDirsByRel(rel: string) {
  return EXCLUDED_DIR_RELS.includes(rel);
}

function excludeDirsByName(name: string) {
  return EXCLUDED_DIR_NAMES.includes(name);
}

const TRANSFORM_EXTS: { readonly [ext: string]: TransformRecord['kind'] } = {
  '.peggy': 'transformPeggy',
  '.text': 'transformText',
  '.yaml': 'transformYaml',
  '.yml': 'transformYaml',
  '.ts': 'transformJs',
  '.tsx': 'transformJs',
  '.js': 'transformJs',
  '.mjs': 'transformJs',
  '.jsx': 'transformJs',
};

function destForFile(srcRel: string, ext: string, kind: Record['kind']): string {
  if (kind === 'copy') {
    return srcRel;
  }
  if (kind === 'transformJs') {
    return srcRel.slice(0, -ext.length) + '.js';
  }
  return srcRel + '.js';
}

export async function buildBatch(
  pkg: Package,
  pkgSrcPath: string,
  pkgDistPath: string,
  repoFilePaths: ReadonlySet<string>
): Promise<Batch> {
  const matchExtraExcludes = pkg.manifest.build?.extraExcludes
    ? makeMatcher(pkg.manifest.build.extraExcludes)
    : false;
  const matchNoParse = pkg.manifest.build?.noParse
    ? makeMatcher(pkg.manifest.build.noParse)
    : false;

  const entries = await Fsp.readdir(pkgSrcPath, { recursive: true, withFileTypes: true });

  const excludedDirRels = new Set<string>();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirAbs = Path.join(entry.parentPath, entry.name);
    const dirRel = Path.relative(pkgSrcPath, dirAbs);
    if (excludeDirsByName(entry.name) || excludeDirsByRel(dirRel)) {
      excludedDirRels.add(dirRel);
    }
  }

  const isInExcludedDir = (fileRel: string): boolean => {
    let cur = Path.dirname(fileRel);
    while (cur !== '.' && cur !== '') {
      if (excludedDirRels.has(cur)) return true;
      cur = Path.dirname(cur);
    }
    return false;
  };

  const records: Record[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const name = entry.name;
    if (excludeFileByName(name)) continue;

    const tags = name.split('.').slice(0, -1);
    if (excludeFileByTags(tags)) continue;

    const srcAbs = Path.join(entry.parentPath, name);
    if (!repoFilePaths.has(srcAbs)) continue;
    const srcRel = Path.relative(pkgSrcPath, srcAbs);

    if (isInExcludedDir(srcRel)) continue;
    if (matchExtraExcludes && matchExtraExcludes(srcRel)) continue;

    const ext = Path.extname(name);
    const transformKind = TRANSFORM_EXTS[ext];
    const noParse = matchNoParse ? matchNoParse(srcRel) : false;
    const kind: Record['kind'] = transformKind && !noParse ? transformKind : 'copy';

    const destRel = destForFile(srcRel, ext, kind);
    const destAbs = Path.join(pkgDistPath, destRel);

    if (kind === 'copy') {
      const stat = await Fsp.stat(srcAbs);
      records.push({ kind, srcAbs, destAbs, srcMode: stat.mode });
    } else {
      records.push({ kind, srcAbs, destAbs });
    }
  }

  return { pkgId: pkg.manifest.id, pkgSrcPath, pkgDistPath, records };
}
