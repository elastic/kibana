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
import type { ScoutTestableComponent } from './testable_component';
import type { ScoutConfigManifest } from './manifest';

export interface ScoutTestConfig {
  path: string;
  category: string;
  type: string;
  component: ScoutTestableComponent;
  manifest: ScoutConfigManifest;
}

export const testConfig = {
  fromPath(configPath: string): ScoutTestConfig {
    const match = configPath.match(SCOUT_CONFIG_PATH_REGEX);

    if (match == null) {
      throw new Error(`Scout config path ${configPath} did not match the expected regex pattern`);
    }

    const [
      _,
      platform,
      solution,
      componentType,
      componentVisibility,
      componentName,
      customTargetConfigSetName,
      testCategory,
      testConfigType,
    ] = match;

    const scoutDirName = `scout${customTargetConfigSetName ? `_${customTargetConfigSetName}` : ''}`;

    const component = {
      name: componentName,
      group: platform ?? solution,
      type: componentType.slice(0, -1) as ScoutTestableComponent['type'],
      visibility: componentVisibility as ScoutTestableComponent['visibility'],
      root: configPath.split(`/test/${scoutDirName}`)[0],
    };

    const manifestPath = path.join(
      component.root,
      'test',
      scoutDirName,
      '.meta',
      testCategory,
      `${testConfigType || 'standard'}.json`
    );
    const manifestExists = existsSync(manifestPath);

    const manifest: ScoutConfigManifest = manifestExists
      ? {
          path: manifestPath,
          exists: manifestExists,
          ...JSON.parse(readFileSync(manifestPath, 'utf8')),
        }
      : {
          path: manifestPath,
          exists: manifestExists,
          tests: [],
        };

    return {
      path: configPath,
      category: testCategory,
      type: testConfigType || 'standard',
      component: {
        name: componentName,
        group: platform ?? solution,
        type: componentType.slice(0, -1) as ScoutTestableComponent['type'],
        visibility: componentVisibility as ScoutTestableComponent['visibility'],
        root: configPath.split('/test/scout')[0],
      },
      manifest,
    };
  },
};

export const testConfigs = {
  _configs: null as ScoutTestConfig[] | null,
  log: new ToolingLog(),

  findPaths(): string[] {
    return globSync(path.join(REPO_ROOT, SCOUT_CONFIG_PATH_GLOB), { onlyFiles: true }).map(
      (configPath) => path.relative(REPO_ROOT, configPath)
    );
  },

  _load() {
    this.log.info(`${this._configs == null ? 'L' : 'Rel'}oading Scout test configs`);

    const loadStartTime = performance.now();
    this._configs = this.findPaths().map((configPath) => testConfig.fromPath(configPath));
    const loadTime = performance.now() - loadStartTime;

    this.log.info(
      `Loaded ${this._configs.length} Scout test configs in ${(loadTime / 1000).toFixed(2)}s`
    );
  },

  reload() {
    this._load();
  },

  get all(): ScoutTestConfig[] {
    if (this._configs === null) this._load();
    return this._configs!;
  },

  forComponent(name: string, type?: ScoutTestableComponent['type']): ScoutTestConfig[] {
    const configs = this.all.filter((config) => config.component.name === name);
    return type === undefined
      ? configs
      : configs.filter((config) => config.component.type === type);
  },

  forPlugin(pluginName: string) {
    return this.forComponent(pluginName, 'plugin');
  },

  forPackage(packageName: string) {
    return this.forComponent(packageName, 'package');
  },
};
