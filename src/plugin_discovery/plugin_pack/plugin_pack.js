import { inspect } from 'util';

import { PluginSpec } from '../plugin_spec';

export class PluginPack {
  constructor({ path, pkg, provider }) {
    this._path = path;
    this._pkg = pkg;
    this._provider = provider;
  }

  /**
   *  Get the contents of this plugin pack's package.json file
   *  @return {Object}
   */
  getPkg() {
    return this._pkg;
  }

  /**
   *  Get the absolute path to this plugin pack on disk
   *  @return {String}
   */
  getPath() {
    return this._path;
  }

  /**
   *  Invoke the plugin pack's provider to get the list
   *  of specs defined in this plugin.
   *  @return {Array<PluginSpec>}
   */
  getPluginSpecs() {
    const pack = this;
    const api = {
      Plugin: class ScopedPluginSpec extends PluginSpec {
        constructor(options) {
          super(pack, options);
        }
      }
    };

    const result = this._provider(api);
    const specs = [].concat(result === undefined ? [] : result);

    // verify that all specs are instances of passed "Plugin" class
    specs.forEach(spec => {
      if (!(spec instanceof api.Plugin)) {
        throw new TypeError('unexpected plugin export ' + inspect(spec));
      }
    });

    return specs;
  }
}
