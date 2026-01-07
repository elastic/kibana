/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ts from 'typescript';
import json5 from 'json5';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { uniqBy } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { DiffedFile } from '../create_tests';
import { nonNullable } from './non_nullable';

export async function getDependentFiles({ files, log }: { files: DiffedFile[]; log: ToolingLog }) {
  // This takes the list of changed files and finds all the modules in the repo that import any of these files.
  // We need to run the checks on these files as well, because they may have been broken by the changes.

  const TSCONFIG_JSON_CONTENT = readFileSync(`${REPO_ROOT}/tsconfig.base.json`, 'utf-8');

  const tsConfigObject = ts.parseJsonConfigFileContent(
    json5.parse(TSCONFIG_JSON_CONTENT),
    ts.sys,
    REPO_ROOT
  );

  const repoModuleImportMap = await buildImportMap({ log, tsConfigObject });

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

async function buildImportMap({
  log,
  tsConfigObject,
}: {
  tsConfigObject: ts.ParsedCommandLine;
  log: ToolingLog;
}) {
  const importMap = await findImportingFiles({ directory: REPO_ROOT, log, tsConfigObject });

  const filtered = Object.keys(importMap).reduce((acc, curr) => {
    if (importMap[curr].length) {
      for (const importThing of importMap[curr]) {
        const combinedSet = new Set([...(acc[importThing] || []), curr]);

        acc[importThing] = Array.from(combinedSet);
      }
    }
    return acc;
  }, {} as Record<string, string[]>);

  // We could write this map to a file and then read it in to make this faster.
  writeFileSync('imports.json', JSON.stringify(filtered, null, 2));

  return filtered;
}

async function findImports({
  filePath,
  tsConfigObject,
}: {
  filePath: string;
  tsConfigObject: ts.ParsedCommandLine;
}): Promise<string[]> {
  const importsForFile: string[] = [];

  const fileContent = readFileSync(filePath).toString();

  const fileInfo = ts.preProcessFile(fileContent);

  fileInfo.importedFiles
    .map((importedModule) => importedModule.fileName)
    .forEach((rawImport) => {
      if (rawImport.startsWith('.') || rawImport.startsWith('@kbn/')) {
        const resolvedImport = ts.resolveModuleName(
          rawImport,
          filePath,
          tsConfigObject.options,
          ts.sys
        );

        const importLoc = resolvedImport.resolvedModule?.resolvedFileName;

        if (importLoc) {
          importsForFile.push(importLoc);
        }
      }
    });

  return importsForFile;
}

async function findImportingFiles({
  directory,
  log,
  map = {},
  tsConfigObject,
}: {
  directory: string;
  log: ToolingLog;
  map?: Record<string, string[]>;
  depth?: number;
  tsConfigObject: ts.ParsedCommandLine;
}): Promise<Record<string, string[]>> {
  const files = readdirSync(directory);

  for (const file of files) {
    const path = `${directory}/${file}`;
    const stats = statSync(path);

    if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      const imports = await findImports({ filePath: path, tsConfigObject });
      map[path] = !map[path] || map[path].length === 0 ? imports : map[path].concat(imports);
    }

    if (
      stats.isDirectory() &&
      (path.includes('src') || path.includes('x-pack') || path.includes('packages'))
    ) {
      await findImportingFiles({ directory: path, log, map, tsConfigObject });
    }
  }

  return map;
}
