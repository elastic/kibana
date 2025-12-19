/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

import json5 from 'json5';
import _ from 'lodash';

import jsYaml from 'js-yaml';

import type { Package } from '@kbn/repo-packages';

export function readFile(filePath: string) {
  return readFileSync(filePath, 'utf8');
}

export function readJsonWithComments(filePath: string) {
  let file;
  try {
    file = readFile(filePath);
    return json5.parse(file);
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

export function filterPackages(allPackages: Package[], filter: string[]): Package[] {
  return allPackages.filter((pkg) => {
    return filter.some(
      (filterAllow) =>
        pkg.name === filterAllow || pkg.normalizedRepoRelativeDir.includes(filterAllow)
    );
  });
}

export function writeYaml(filePath: string, obj: any, preamble: string | null = null) {
  let fileContent = jsYaml.dump(obj, {
    lineWidth: 300,
    noRefs: true,
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
