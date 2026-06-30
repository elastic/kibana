/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

import { parse } from 'hjson';
import _ from 'lodash';

import { Document, Scalar, visit } from 'yaml';

import type { Package } from '@kbn/repo-packages';

/**
 * Characters that js-yaml treated as YAML indicator characters, causing strings
 * starting with them to be quoted. The `yaml` library follows the YAML 1.2 spec
 * more precisely and allows some of these (like `-` not followed by space) as
 * plain scalars. To preserve backward-compatible quoting in generated files, we
 * explicitly set QUOTE_SINGLE on scalar values starting with these characters.
 */
const YAML_INDICATOR_CHARS = `-?:#&*!|>'"@`;

export function readFile(filePath: string) {
  return readFileSync(filePath, 'utf8');
}

export function readJsonWithComments(filePath: string) {
  let file;
  try {
    file = readFile(filePath);
    return parse(file);
  } catch (e) {
    e.message = `${e.message}\n in ${filePath}\n\n${file}`;
    throw e;
  }
}

export function sortObjectByKeyPriority(obj: any, keyOrder: string[] = []) {
  const kvPairs = _.sortBy(Object.entries(obj), ([key]) => {
    const idx = keyOrder.indexOf(key);
    return idx === -1 ? keyOrder.indexOf('*') : idx;
  });
  const sortedObj = _.fromPairs(kvPairs);
  Object.keys(obj).forEach((k) => delete obj[k]);
  Object.assign(obj, sortedObj);
}

export function resolveFirstExisting(dir: string, files: string[]) {
  return files.find((f) => existsSync(path.resolve(dir, f)));
}

/**
 * Recursively find all matching config files within a directory, stopping at
 * child project boundaries (directories that contain a kibana.jsonc).
 *
 * @param dir - Absolute path to the project source root
 * @param fileNames - Config file names to search for (e.g. jest.config.js)
 * @param boundaryFile - File whose presence marks a child project boundary (default: kibana.jsonc)
 * @returns Relative paths (from dir) of all matching files found
 */
export function findAllMatchingConfigs(
  dir: string,
  fileNames: string[],
  boundaryFile = 'kibana.jsonc'
): string[] {
  const results: string[] = [];

  const walk = (currentDir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }

    // Check if this subdirectory is a separate project (skip it)
    if (currentDir !== dir && entries.includes(boundaryFile)) {
      return;
    }

    for (const fileName of fileNames) {
      if (entries.includes(fileName)) {
        const fullPath = path.join(currentDir, fileName);
        try {
          if (statSync(fullPath).isFile()) {
            results.push(path.relative(dir, fullPath));
          }
        } catch {
          // skip if stat fails
        }
      }
    }

    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'target' || entry === '.git') {
        continue;
      }
      const fullPath = path.join(currentDir, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          walk(fullPath);
        }
      } catch {
        // skip if stat fails
      }
    }
  };

  walk(dir);
  return results.sort();
}

export function filterPackages(allPackages: Package[], filter: string[]): Package[] {
  return allPackages.filter((pkg) => {
    return filter.some(
      (filterAllow) =>
        pkg.name === filterAllow || pkg.normalizedRepoRelativeDir.includes(filterAllow)
    );
  });
}

export function writeYaml(filePath: string, obj: any, preamble: string | null = null) {
  const doc = new Document(obj, { aliasDuplicateObjects: false });

  // Quote string values that start with YAML indicator characters, matching the
  // quoting behavior of the previously-used js-yaml library.
  visit(doc, {
    Scalar(_key, node) {
      if (
        typeof node.value === 'string' &&
        node.value.length > 0 &&
        YAML_INDICATOR_CHARS.includes(node.value.charAt(0))
      ) {
        node.type = Scalar.QUOTE_SINGLE;
      }
    },
  });

  let fileContent = doc.toString({
    lineWidth: 300,
    singleQuote: true,
  });

  if (preamble) {
    fileContent = preamble + '\n\n' + fileContent;
  }

  if (existsSync(filePath) && readFile(filePath) === fileContent) {
    return false;
  } else {
    writeFileSync(filePath, fileContent);
    return true;
  }
}

export function compactFilePathsToGlobs(filePaths: string[]): string[] {
  const folderGlobs = new Set<string>();
  const files: string[] = [];
  filePaths.forEach((filePath) => {
    if (filePath.includes(path.sep)) {
      const dirGlob = filePath.split(path.sep)[0] + path.sep + '**' + path.sep + '*';
      folderGlobs.add(dirGlob);
    } else {
      files.push(filePath);
    }
  });

  return [...folderGlobs, ...files].map((e) => e.replaceAll(path.sep, '/'));
}
