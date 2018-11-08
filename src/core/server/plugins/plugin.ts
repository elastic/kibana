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

import typeDetect from 'type-detect';
import { ConfigPath } from '../config';
import { Logger } from '../logging';
import { PluginsCore } from './plugins_core';

/**
 * Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays
 * that use it as a key or value more obvious.
 * @internal
 */
export type PluginName = string;

/**
 * Describes the set of required and optional properties plugin can define in its
 * mandatory JSON manifest file.
 * @internal
 */
export interface PluginManifest {
  /**
   * Identifier of the plugin.
   */
  readonly id: PluginName;

  /**
   * Version of the plugin.
   */
  readonly version: string;

  /**
   * The version of Kibana the plugin is compatible with, defaults to "version".
   */
  readonly kibanaVersion: string;

  /**
   * Root configuration path used by the plugin, defaults to "id".
   */
  readonly configPath: ConfigPath;

  /**
   * An optional list of the other plugins that **must be** installed and enabled
   * for this plugin to function properly.
   */
  readonly requiredPlugins: ReadonlyArray<PluginName>;

  /**
   * An optional list of the other plugins that if installed and enabled **may be**
   * leveraged by this plugin for some additional functionality but otherwise are
   * not required for this plugin to work properly.
   */
  readonly optionalPlugins: ReadonlyArray<PluginName>;

  /**
   * Specifies whether plugin includes some client/browser specific functionality
   * that should be included into client bundle via `public/ui_plugin.js` file.
   */
  readonly ui: boolean;
}

/**
 * Definition of the plugin assembled from its path, manifest and initializer function.
 */
interface PluginDefinition<TExposedContract, TDependencies extends Record<PluginName, any>> {
  path: string;
  manifest: PluginManifest;
  initializer: (
    core: PluginsCore,
    dependencies: TDependencies
  ) => {
    start: () => TExposedContract;
    stop?: () => void;
  };
}

/** @internal */
export class Plugin<
  TExposedContract = any,
  TDependencies extends Record<PluginName, any> = Record<PluginName, any>
> {
  public readonly name: PluginManifest['id'];
  public readonly configPath: PluginManifest['configPath'];
  public readonly requiredDependencies: PluginManifest['requiredPlugins'];
  public readonly optionalDependencies: PluginManifest['optionalPlugins'];

  private instance?: ReturnType<PluginDefinition<TExposedContract, TDependencies>['initializer']>;

  constructor(
    private readonly definition: PluginDefinition<TExposedContract, TDependencies>,
    private readonly log: Logger
  ) {
    this.name = definition.manifest.id;
    this.configPath = definition.manifest.configPath;
    this.requiredDependencies = definition.manifest.requiredPlugins;
    this.optionalDependencies = definition.manifest.optionalPlugins;
  }

  public async start(core: PluginsCore, dependencies: TDependencies) {
    this.log.info('starting plugin');

    const instance = this.definition.initializer(core, dependencies);
    if (!instance || typeof instance !== 'object') {
      throw new Error(
        `Initializer for plugin "${
          this.definition.manifest.id
        }" is expected to return plugin instance, but returned "${typeDetect(instance)}".`
      );
    }

    if (typeof instance.start !== 'function') {
      throw new Error(
        `Instance of plugin "${this.definition.manifest.id}" does not define "start" function.`
      );
    }

    this.instance = instance;

    return await this.instance.start();
  }

  public async stop() {
    if (this.instance === undefined) {
      return;
    }

    this.log.info('stopping plugin');

    if (typeof this.instance.stop === 'function') {
      await this.instance.stop();
    }
  }
}
