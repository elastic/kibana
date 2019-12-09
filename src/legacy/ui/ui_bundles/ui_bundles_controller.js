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

import { resolve, relative, isAbsolute } from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { existsSync, mkdir } from 'fs';

import del from 'del';
import { makeRe } from 'minimatch';
import jsonStableStringify from 'json-stable-stringify';

import { IS_KIBANA_DISTRIBUTABLE } from '../../utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot } from '../../../core/server/utils';
import { UiBundle } from './ui_bundle';
import { appEntryTemplate } from './app_entry_template';

const mkdirAsync = promisify(mkdir);
const REPO_ROOT = fromRoot();

function getWebpackAliases(pluginSpecs) {
  return pluginSpecs.reduce((aliases, spec) => {
    const publicDir = spec.getPublicDir();

    if (!publicDir) {
      return aliases;
    }

    return {
      ...aliases,
      [`plugins/${spec.getId()}`]: publicDir
    };
  }, {});
}

// Recursively clone appExtensions, sorting array and normalizing absolute paths
function stableCloneAppExtensions(appExtensions) {
  return Object.fromEntries(
    Object.entries(appExtensions).map(([extensionType, moduleIds]) => [
      extensionType,
      moduleIds
        .map(moduleId => {
          if (isAbsolute(moduleId)) {
            moduleId = `absolute:${relative(REPO_ROOT, moduleId)}`;
          }
          return moduleId.replace(/\\/g, '/');
        })
        .sort((a, b) => a.localeCompare(b))
    ])
  );
}

export class UiBundlesController {
  constructor(kbnServer) {
    const { config, uiApps, uiExports, pluginSpecs } = kbnServer;

    this._workingDir = config.get('optimize.bundleDir');
    this._env = config.get('env.name');
    this._context = {
      env: config.get('env.name'),
      sourceMaps: config.get('optimize.sourceMaps'),
      kbnVersion: config.get('pkg.version'),
      buildNum: config.get('pkg.buildNum'),
      appExtensions: stableCloneAppExtensions(uiExports.appExtensions),
    };

    this._filter = makeRe(config.get('optimize.bundleFilter') || '*', {
      noglobstar: true,
      noext: true,
      matchBase: true
    });

    this._appExtensions = uiExports.appExtensions || {};

    this._webpackAliases = {
      ...getWebpackAliases(pluginSpecs),
      ...uiExports.webpackAliases
    };
    this._webpackPluginProviders = uiExports.webpackPluginProviders;
    this._webpackNoParseRules = uiExports.webpackNoParseRules;
    this._postLoaders = [];
    this._bundles = [];

    // create a bundle for core-only with no modules
    this.add({
      id: 'core',
      modules: [],
      template: appEntryTemplate
    });

    // create a bundle for each uiApp
    for (const uiApp of uiApps) {
      this.add({
        id: uiApp.getId(),
        modules: [uiApp.getMainModuleId()],
        template: appEntryTemplate,
      });
    }
  }

  add(bundleSpec) {
    const {
      id,
      modules,
      template,
      extendConfig,
    } = bundleSpec;

    if (this._filter.test(id)) {
      this._bundles.push(new UiBundle({
        id,
        modules,
        template,
        controller: this,
        extendConfig,
      }));
    }
  }

  isDevMode() {
    return this._env === 'development';
  }

  getWebpackPluginProviders() {
    return this._webpackPluginProviders || [];
  }

  getWebpackNoParseRules() {
    return this._webpackNoParseRules;
  }

  getWorkingDir() {
    return this._workingDir;
  }

  addPostLoader(loaderSpec) {
    this._postLoaders.push(loaderSpec);
  }

  getPostLoaders() {
    return this._postLoaders;
  }

  getAliases() {
    return this._webpackAliases;
  }

  getAppExtensions() {
    return this._appExtensions;
  }

  getContext() {
    return jsonStableStringify(this._context, {
      space: '  '
    });
  }

  resolvePath(...args) {
    return resolve(this._workingDir, ...args);
  }

  async resetBundleDir() {
    if (!existsSync(this._workingDir)) {
      // create a fresh working directory
      await mkdirAsync(this._workingDir, { recursive: true });
    } else {
      // delete all children of the working directory
      await del(this.resolvePath('*'), {
        // since we know that `this.resolvePath()` is going to return an absolute path based on the `optimize.bundleDir`
        // and since we don't want to require that users specify a bundleDir that is within the cwd or limit the cwd
        // directory used to run Kibana in any way we use force here
        force: true
      });
    }

    // write the entry/style files for each bundle
    for (const bundle of this._bundles) {
      await bundle.writeEntryFile();
      await bundle.touchStyleFile();
    }
  }

  getCacheDirectory(...subPath) {
    return this.resolvePath(
      '../../built_assets/.cache/ui_bundles',
      !IS_KIBANA_DISTRIBUTABLE ? this.hashBundleEntries() : '',
      ...subPath
    );
  }

  getDescription() {
    const ids = this.getIds();
    switch (ids.length) {
      case 0:
        return '0 bundles';
      case 1:
        return `bundle for ${ids[0]}`;
      default:
        const last = ids.pop();
        const commas = ids.join(', ');
        return `bundles for ${commas} and ${last}`;
    }
  }

  hashBundleEntries() {
    const hash = createHash('sha1');

    for (const bundle of this._bundles) {
      hash.update(`bundleEntryPath:${bundle.getEntryPath()}`);
      hash.update(`bundleEntryContent:${bundle.renderContent()}`);
    }

    return hash.digest('hex');
  }

  async areAllBundleCachesValid() {
    for (const bundle of this._bundles) {
      if (!await bundle.isCacheValid()) {
        return false;
      }
    }

    return true;
  }

  toWebpackEntries() {
    return this._bundles.reduce((entries, bundle) => ({
      ...entries,
      [bundle.getId()]: bundle.getEntryPath(),
    }), {});
  }

  getIds() {
    return this._bundles
      .map(bundle => bundle.getId());
  }

  getExtendedConfig(webpackConfig) {
    return this._bundles.reduce((acc, bundle) => bundle.getExtendedConfig(acc), webpackConfig);
  }
}
