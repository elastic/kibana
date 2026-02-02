/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globSync } from 'fast-glob';
import { REPO_ROOT } from '@kbn/repo-info';
import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import { SCOUT_CONFIG_PATH_GLOB, SCOUT_CONFIG_PATH_REGEX } from '@kbn/scout-info';
import { existsSync, readFileSync } from 'node:fs';
import type { ScoutTestableModule } from './testable_module';
import type { ScoutConfigManifest } from './manifest';

export interface ScoutTestConfig {
  path: string;
  category: string;
  type: string;
  module: ScoutTestableModule;
  manifest: ScoutConfigManifest;
}

export const testConfig = {
  fromPath(configPath: string): ScoutTestConfig {
    // Make sure we're working with a path relative to the repo root
    if (path.isAbsolute(configPath)) {
      configPath = path.relative(REPO_ROOT, configPath);
    }

    if (configPath.startsWith('..')) {
      throw new Error(
        `Failed to create Scout config from path '${configPath}': ` +
          `path ${path.resolve(configPath)} is not part of the Kibana repository at ${REPO_ROOT}`
      );
    }

    const match = configPath.match(SCOUT_CONFIG_PATH_REGEX);

    if (match == null) {
      throw new Error(
        `Failed to create Scout config from path '${configPath}': ` +
          'path did not match the expected regex pattern'
      );
    }

    const [
      _,
      platform,
      solution,
      moduleType,
      moduleVisibility,
      moduleName,
      customTargetConfigSetName,
      testCategory,
      testConfigType,
    ] = match;

    const scoutDirName = `scout${customTargetConfigSetName ? `_${customTargetConfigSetName}` : ''}`;
    const moduleRoot = configPath.split('/test/scout')[0];

    const manifestPath = path.join(
      moduleRoot,
      'test',
      scoutDirName,
      '.meta',
      testCategory,
      `${testConfigType || 'standard'}.json`
    );
    const absoluteManifestPath = path.join(REPO_ROOT, manifestPath);
    const manifestExists = existsSync(absoluteManifestPath);
    let manifestFileData;

    if (manifestExists) {
      try {
        manifestFileData = JSON.parse(readFileSync(absoluteManifestPath, 'utf8'));
      } catch (e) {
        e.message = `Failed while trying to load manifest file at '${manifestPath}': ${e.message}`;
        throw e;
      }
    } else {
      manifestFileData = {
        lastModified: new Date(0).toISOString(),
        sha1: '000000000000000-000000000000000',
        tests: [],
      };
    }

    return {
      path: configPath,
      category: testCategory,
      type: testConfigType || 'standard',
      module: {
        name: moduleName,
        group: platform ?? solution,
        type: moduleType.slice(0, -1) as ScoutTestableModule['type'],
        visibility: (moduleVisibility || 'private') as ScoutTestableModule['visibility'],
        root: moduleRoot,
      },
      manifest: {
        path: manifestPath,
        exists: manifestExists,
        ...manifestFileData,
      },
    };
  },
};

export const testConfigs = {
  _configs: null as ScoutTestConfig[] | null,
  log: new ToolingLog(),

  findPaths(): string[] {
    const pattern = path.join(REPO_ROOT, SCOUT_CONFIG_PATH_GLOB);
    const configPaths = globSync(pattern, { onlyFiles: true });
    return configPaths.map((configPath) => path.relative(REPO_ROOT, configPath));
  },

  _load() {
    const action = this._configs === null ? 'Load' : 'Reload';
    this.log.info(`${action}ing Scout test configs`);

    const startTime = performance.now();
    this._configs = this.findPaths().map(testConfig.fromPath);
    const duration = (performance.now() - startTime) / 1000;

    this.log.info(`Loaded ${this._configs.length} Scout test configs in ${duration.toFixed(2)}s`);
  },

  reload() {
    this._load();
  },

  get all(): ScoutTestConfig[] {
    if (this._configs === null) this._load();
    return this._configs!;
  },

  forModule(name: string, type?: ScoutTestableModule['type']): ScoutTestConfig[] {
    const configs = this.all.filter((config) => config.module.name === name);
    return type ? configs.filter((config) => config.module.type === type) : configs;
  },

  forPlugin(pluginName: string): ScoutTestConfig[] {
    return this.forModule(pluginName, 'plugin');
  },

  forPackage(packageName: string): ScoutTestConfig[] {
    return this.forModule(packageName, 'package');
  },
};
