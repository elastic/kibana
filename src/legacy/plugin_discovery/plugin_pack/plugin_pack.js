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
      },
    };

    const result = this._provider(api);
    const specs = [].concat(result === undefined ? [] : result);

    // verify that all specs are instances of passed "Plugin" class
    specs.forEach((spec) => {
      if (!(spec instanceof api.Plugin)) {
        throw new TypeError('unexpected plugin export ' + inspect(spec));
      }
    });

    return specs;
  }
}
