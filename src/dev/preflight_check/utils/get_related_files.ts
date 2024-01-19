/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import oxc from 'oxc-parser';
import { readdirSync, statSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { invertBy, uniqBy } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { DiffedFile } from '../create_tests';
import { nonNullable } from './non_nullable';

async function findImports({
  filePath,
  log,
}: {
  filePath: string;
  log: ToolingLog;
}): Promise<string[]> {
  const importsForFile: string[] = [];
  const fileSource = readFileSync(filePath, 'utf8');

  const { program } = await oxc.parseAsync(fileSource, {
    sourceFilename: filePath,
    sourceType: 'module',
  });

  try {
    const parsed = JSON.parse(program);
    parsed.body.forEach((node: any) => {
      if (node.type === 'ImportDeclaration' && node.source.value.startsWith('.')) {
        importsForFile.push(resolve(dirname(filePath), `${node.source.value}.ts`));
      }
    });
  } catch (error) {
    log.error(`Could not parse program: ${error}`);
  }

  return importsForFile;
}

async function findImportingFiles({
  directory,
  log,
  map = {},
  depth = 999,
}: {
  directory: string;
  log: ToolingLog;
  map?: Record<string, string[]>;
  depth?: number;
}): Promise<Record<string, string[]>> {
  const files = readdirSync(directory);
  for (const file of files) {
    if (depth === 0) return map;

    const path = `${directory}/${file}`;
    const stats = statSync(path);

    if (stats.isFile() && file.endsWith('.ts')) {
      const imports = await findImports({ filePath: path, log });
      map[path] = imports;
    }

    if (
      stats.isDirectory() &&
      (path.includes('src') || path.includes('x-pack') || path.includes('packages'))
    ) {
      await findImportingFiles({ directory: path, log, depth: depth - 1, map });
    }
  }

  return map;
}

export async function buildImportMap({
  directory = REPO_ROOT,
  log,
}: {
  directory?: string;
  log: ToolingLog;
}) {
  const importMap = await findImportingFiles({ directory, log });

  // We could write this map to a file and then read it in to make this faster.
  // writeFileSync('imports.json', JSON.stringify(inverted, null, 2));

  return invertBy(importMap);
}

export async function getRelatedFiles({ files, log }: { files: DiffedFile[]; log: ToolingLog }) {
  // This takes the list of changed files and finds all the modules in the repo that import any of these files.
  // We need to run the checks on these files as well, because they may have been broken by the changes.
  const repoModuleImportMap = await buildImportMap({ log });

  const relatedFiles = files
    .flatMap((file) => {
      return repoModuleImportMap[`${REPO_ROOT}/${file.path}`]?.map((path) => ({
        path: path.replace(`${REPO_ROOT}/`, ''),
        mode: '',
        removed: [],
        hunk: '',
        added: [],
      }));
    })
    .filter(nonNullable);

  return uniqBy(files.concat(relatedFiles), 'path');
}
