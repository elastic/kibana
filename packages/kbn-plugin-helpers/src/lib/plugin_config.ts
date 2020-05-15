/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/dev-utils';
import { configFile } from './config_file';
import { parsePkgJson } from './parse_pkg_json';

export interface PluginConfig {
  root: string;
  kibanaRoot: string;
  serverTestPatterns: string[];
  buildSourcePatterns: string[];
  skipInstallDependencies: boolean;
  id: string;
  version: string;
  pkg: any;
  usesKp: boolean;
  styleSheetToCompile?: string;
  [k: string]: unknown;
}

export function pluginConfig(root: string = process.cwd()): PluginConfig {
  const pluginPackageJsonPath = Path.resolve(root, 'package.json');
  const pkg = parsePkgJson(pluginPackageJsonPath);

  const usesKp = Fs.existsSync(Path.resolve(root, 'kibana.json'));

  const buildSourcePatterns = [
    'yarn.lock',
    'tsconfig.json',
    'package.json',
    'kibana.json',
    'index.{js,ts}',
    '{lib,server,server,webpackShims,translations}/**/*',
  ];

  const isXpack = pkg.name === 'x-pack';

  if (!isXpack && Path.resolve(root, '..') !== Path.resolve(REPO_ROOT, 'plugins')) {
    throw new Error(
      `Plugin located at ${root} must be moved to the plugins directory within the Kibana repo`
    );
  }

  const config = configFile(root);

  let styleSheetToCompile;
  if (typeof config.styleSheetToCompile === 'string') {
    if (usesKp) {
      throw new Error(
        '"styleSheetToCompile" is no longer supported once migrating to the Kibana Platform, import .scss files instead'
      );
    }
    styleSheetToCompile = Path.resolve(root, config.styleSheetToCompile);
    if (!Fs.existsSync(config.styleSheetToCompile)) {
      throw new Error(`"styleSheetToCompile" path does not exist [${config.styleSheetToCompile}]`);
    }
  } else if (config.styleSheetToCompile) {
    throw new Error(`"styleSheetToCompile" must be a string or undefined`);
  }

  return {
    root,
    kibanaRoot: REPO_ROOT,
    serverTestPatterns: ['server/**/__tests__/**/*.js'],
    buildSourcePatterns,
    skipInstallDependencies: false,
    id: pkg.name as string,
    version: pkg.version as string,
    pkg,
    usesKp,
    ...config,
    styleSheetToCompile,
  };
}
