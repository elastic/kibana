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

import { resolve } from 'path';
import { readFileSync } from 'fs';

import { configFile } from './config_file';

export interface PluginConfig {
  root: string;
  kibanaRoot: string;
  serverTestPatterns: string[];
  buildSourcePatterns: string[];
  skipInstallDependencies: boolean;
  id: string;
  version: string;
  pkg: any;
  [k: string]: unknown;
}

export function pluginConfig(root: string = process.cwd()): PluginConfig {
  const pluginPackageJsonPath = resolve(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pluginPackageJsonPath, 'utf8'));

  const buildSourcePatterns = [
    'yarn.lock',
    'tsconfig.json',
    'package.json',
    'index.{js,ts}',
    '{lib,public,server,webpackShims,translations}/**/*',
  ];

  const kibanaExtraDir = resolve(root, '../../kibana');
  const kibanaPluginsDir = resolve(root, '../../');
  const isPluginOnKibanaExtra = pluginPackageJsonPath.includes(kibanaExtraDir);
  const isPluginXpack = pkg.name === 'x-pack';

  if (isPluginOnKibanaExtra && !isPluginXpack) {
    // eslint-disable-next-line no-console
    console.warn(
      `In the future we will disable ../kibana-extra/{pluginName}. You should move your plugin ${pkg.name} as soon as possible to ./plugins/{pluginName}`
    );
  }

  const kibanaRootWhenNotXpackPlugin = isPluginOnKibanaExtra ? kibanaExtraDir : kibanaPluginsDir;

  return {
    root,
    kibanaRoot: isPluginXpack ? resolve(root, '..') : kibanaRootWhenNotXpackPlugin,
    serverTestPatterns: ['server/**/__tests__/**/*.js'],
    buildSourcePatterns,
    skipInstallDependencies: false,
    id: pkg.name as string,
    version: pkg.version as string,
    pkg,
    ...configFile(root),
  };
}
