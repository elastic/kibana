import { resolve } from 'path';

import Joi from 'joi';
import toPath from 'lodash/internal/toPath';

import { validate } from './lib';
import { isVersionCompatible } from './is_version_compatible';

const PluginSpecOptionsSchema = Joi.object().keys({
  uiExports: Joi.object().default(),
  configPrefix: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  config: Joi.func(),
  deprecations: Joi.func(),
  publicDir: Joi.boolean().default(true),
  preInit: Joi.func(),
  init: Joi.func(),
  isEnabled: Joi.func(),
}).default();

export class PluginSpec {
  /**
   * @param {string} path The directory containing this plugin
   * @param {Object} kibanaJson A parsed kibana.json file
   * @param {Object} options the non-static options for this plugin
   * @property {Object} [options.uiExports] a mapping of UiExport types to
   * UI modules or metadata about the UI module
   * @property {Function} [options.configPrefix=this.id] The prefix to use for
   * configuration values in the main configuration service
   * @property {Function} [options.config] A function that produces a configuration
   * schema using Joi, which is passed as its first argument.
   * @property {Function} [options.deprecations] A function that will be called with
   * the deprecation helpers and should return an array of deprecation handlers
   * that will mutate the config before it is set and generate deprecation warning
   * messages that should be logged.
   * @property {Function} [options.preInit] A function that will be called before
   * any plugin init() functions are called.
   * @property {Function} [options.init] A function that will be called to initialize
   * this plugin at the appropriate time.
   * @property {Function} [options.isEnabled] A function that will be called with
   * a config service and should return true or false to enable or disable the plugin
   */
  constructor(path, kibanaJson, options) {
    const {
      id,
      version,
      kibanaVersion = version,
      requiredPlugins,
    } = kibanaJson;

    const {
      uiExports,
      configPrefix,
      config,
      deprecations,
      publicDir,
      preInit,
      init,
      isEnabled,
    } = validate(id, path, 'Plugin(options)', options, PluginSpecOptionsSchema);

    this._path = path;
    this._id = id;
    this._version = version;
    this._kibanaVersion = kibanaVersion;
    this._requiredPlugins = requiredPlugins;
    this._publicDir = publicDir;
    this._uiExports = uiExports;
    this._configPrefix = configPrefix;
    this._configSchemaProvider = config;
    this._configDeprecationsProvider = deprecations;
    this._preInit = preInit;
    this._init = init;
    this._isEnabled = isEnabled;
  }

  getPack() {
    return this._pack;
  }

  getPath() {
    return this._path;
  }

  getId() {
    return this._id;
  }

  getVersion() {
    return this._version;
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
    return this._kibanaVersion;
  }

  isVersionCompatible(actualKibanaVersion) {
    return isVersionCompatible(this.getExpectedKibanaVersion(), actualKibanaVersion);
  }

  getRequiredPluginIds() {
    return this._requiredPlugins;
  }

  getPublicDir() {
    return this._publicDir
      ? resolve(this._path, 'public')
      : null;
  }

  getExportSpecs() {
    return this._uiExports;
  }

  getPreInitHandler() {
    return this._preInit;
  }

  getInitHandler() {
    return this._init;
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
