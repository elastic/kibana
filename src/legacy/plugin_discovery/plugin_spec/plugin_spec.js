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

import { resolve, basename, isAbsolute as isAbsolutePath } from 'path';

import toPath from 'lodash/internal/toPath';
import { get } from 'lodash';

import { createInvalidPluginError } from '../errors';
import { isVersionCompatible } from './is_version_compatible';

export class PluginSpec {
  /**
   * @param {PluginPack} pack The plugin pack that produced this spec
   * @param {Object} opts the options for this plugin
   * @param {String} [opts.id=pkg.name] the id for this plugin.
   * @param {Object} [opts.uiExports] a mapping of UiExport types to
   * UI modules or metadata about the UI module
   * @param {Array} [opts.require] the other plugins that this plugin
   * requires. These plugins must exist and be enabled for this plugin
   * to function. The require'd plugins will also be initialized first,
   * in order to make sure that dependencies provided by these plugins
   * are available
   * @param {String} [opts.version=pkg.version] the version of this plugin
   * @param {Function} [opts.init] A function that will be called to initialize
   * this plugin at the appropriate time.
   * @param {Function} [opts.configPrefix=this.id] The prefix to use for
   * configuration values in the main configuration service
   * @param {Function} [opts.config] A function that produces a configuration
   * schema using Joi, which is passed as its first argument.
   * @param {String|False} [opts.publicDir=path + '/public'] the public
   * directory for this plugin. The final directory must have the name "public",
   * though it can be located somewhere besides the root of the plugin. Set
   * this to false to disable exposure of a public directory
   */
  constructor(pack, options) {
    const {
      id,
      require,
      version,
      kibanaVersion,
      uiExports,
      uiCapabilities,
      publicDir,
      configPrefix,
      config,
      deprecations,
      preInit,
      init,
      postInit,
      isEnabled,
    } = options;

    this._id = id;
    this._pack = pack;
    this._version = version;
    this._kibanaVersion = kibanaVersion;
    this._require = require;

    this._publicDir = publicDir;
    this._uiExports = uiExports;
    this._uiCapabilities = uiCapabilities;

    this._configPrefix = configPrefix;
    this._configSchemaProvider = config;
    this._configDeprecationsProvider = deprecations;

    this._isEnabled = isEnabled;
    this._preInit = preInit;
    this._init = init;
    this._postInit = postInit;

    if (!this.getId()) {
      throw createInvalidPluginError(this, 'Unable to determine plugin id');
    }

    if (!this.getVersion()) {
      throw createInvalidPluginError(this, 'Unable to determine plugin version');
    }

    if (this.getRequiredPluginIds() !== undefined && !Array.isArray(this.getRequiredPluginIds())) {
      throw createInvalidPluginError(this, '"plugin.require" must be an array of plugin ids');
    }

    if (this._publicDir) {
      if (!isAbsolutePath(this._publicDir)) {
        throw createInvalidPluginError(this, 'plugin.publicDir must be an absolute path');
      }
      if (basename(this._publicDir) !== 'public') {
        throw createInvalidPluginError(this, `publicDir for plugin ${this.getId()} must end with a "public" directory.`);
      }
    }
  }

  getPack() {
    return this._pack;
  }

  getPkg() {
    return this._pack.getPkg();
  }

  getPath() {
    return this._pack.getPath();
  }

  getId() {
    return this._id || this.getPkg().name;
  }

  getVersion() {
    return this._version || this.getPkg().version;
  }

  isEnabled(config) {
    if (!config || typeof config.get !== 'function' || typeof config.has !== 'function') {
      throw new TypeError('PluginSpec#isEnabled() must be called with a config service');
    }

    if (this._isEnabled) {
      return this._isEnabled(config);
    }

    return Boolean(this.readConfigValue(config, 'enabled'));
  }

  getExpectedKibanaVersion() {
    // Plugins must specify their version, and by default that version should match
    // the version of kibana down to the patch level. If these two versions need
    // to diverge, they can specify a kibana.version in the package to indicate the
    // version of kibana the plugin is intended to work with.
    return this._kibanaVersion || get(this.getPack().getPkg(), 'kibana.version') || this.getVersion();
  }

  isVersionCompatible(actualKibanaVersion) {
    return isVersionCompatible(this.getExpectedKibanaVersion(), actualKibanaVersion);
  }

  getRequiredPluginIds() {
    return this._require;
  }

  getPublicDir() {
    if (this._publicDir === false) {
      return null;
    }

    if (!this._publicDir) {
      return resolve(this.getPack().getPath(), 'public');
    }

    return this._publicDir;
  }

  getExportSpecs() {
    return this._uiExports;
  }

  getUiCapabilitiesProvider() {
    return this._uiCapabilities;
  }

  getPreInitHandler() {
    return this._preInit;
  }

  getInitHandler() {
    return this._init;
  }

  getPostInitHandler() {
    return this._postInit;
  }

  getConfigPrefix() {
    return this._configPrefix || this.getId();
  }

  getConfigSchemaProvider() {
    return this._configSchemaProvider;
  }

  readConfigValue(config, key) {
    return config.get([...toPath(this.getConfigPrefix()), ...toPath(key)]);
  }

  getDeprecationsProvider() {
    return this._configDeprecationsProvider;
  }
}
