/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '../repo_root';

interface KibanaPackageJson {
  name: string;
  version: string;
  branch: string;
  build: {
    number: number;
    sha: string;
    distributable?: boolean;
  };
  dependencies: {
    [dep: string]: string;
  };
  devDependencies: {
    [dep: string]: string;
  };
  engines?: {
    [name: string]: string | undefined;
  };
  [key: string]: unknown;
}

function parseKibanaPackageJson() {
  const path = Path.resolve(REPO_ROOT, 'package.json');
  const json = Fs.readFileSync(path, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(json);
  } catch (error) {
    throw new Error(`unable to parse kibana's package.json file: ${error.message}`);
  }

  return pkg as KibanaPackageJson;
}

export const kibanaPackageJson = parseKibanaPackageJson();

export const isKibanaDistributable = () => {
  return kibanaPackageJson.build.distributable === true;
};
