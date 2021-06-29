/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import loadJsonFile from 'load-json-file';

const readKibanaPkgJson = (dir: string) => {
  try {
    const path = Path.resolve(dir, 'package.json');
    const json = loadJsonFile.sync(path);
    if (json && typeof json === 'object' && 'name' in json && json.name === 'kibana') {
      return json;
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
};

const findKibanaPackageJson = () => {
  // search for the kibana directory, since this file is moved around it might
  // not be where we think but should always be a relatively close parent
  // of this directory
  const startDir = __dirname;
  const { root: rootDir } = Path.parse(startDir);
  let cursor = startDir;
  while (true) {
    const kibanaPkgJson = readKibanaPkgJson(cursor);
    if (kibanaPkgJson) {
      return {
        kibanaDir: cursor,
        kibanaPkgJson: kibanaPkgJson as {
          name: string;
          branch: string;
        },
      };
    }

    const parent = Path.dirname(cursor);
    if (parent === rootDir) {
      throw new Error(`unable to find kibana directory from ${startDir}`);
    }
    cursor = parent;
  }
};

const { kibanaDir, kibanaPkgJson } = findKibanaPackageJson();

export const REPO_ROOT = kibanaDir;
export const UPSTREAM_BRANCH = kibanaPkgJson.branch;

export const fromRoot = (...paths: string[]) => Path.resolve(REPO_ROOT, ...paths);
