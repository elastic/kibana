import { readdir } from 'fs';
import { Observable } from 'rxjs';

import { Plugin } from './Plugin';
import { PluginSystem } from './PluginSystem';
import { Logger, LoggerFactory } from '../../logging';
import { CoreService } from '../../types';
import { ConfigService } from '../../config';

const readDirAsObservable = Observable.bindNodeCallback(readdir);

export class PluginsService implements CoreService {
  private readonly log: Logger;

  constructor(
    private readonly pluginsDir: string,
    private readonly pluginSystem: PluginSystem,
    private readonly configService: ConfigService,
    private readonly logger: LoggerFactory
  ) {
    this.log = this.logger.get('plugins');
  }

  async start() {
    await this.readPlugins()
      .mergeMap(
        plugin => this.isPluginEnabled(plugin),
        (plugin, isEnabled) => ({ plugin, isEnabled })
      )
      .filter(plugin => {
        if (plugin.isEnabled) {
          return true;
        }

        this.log.warn(
          `Plugin [${plugin.plugin.name}] is disabled and will not be started`
        );
        return false;
      })
      .do(plugin => {
        this.pluginSystem.addPlugin(plugin.plugin);
      })
      .toPromise();

    this.pluginSystem.startPlugins();
  }

  async stop() {
    this.pluginSystem.stopPlugins();
  }

  /**
   * Read all plugin configs from disk and returns a topologically sorted list
   * of plugins.
   */
  private readPlugins() {
    return readDirAsObservable(this.pluginsDir)
      .mergeMap(dirs => dirs)
      .map(name => {
        const pluginPath = `${this.pluginsDir}/${name}/`;
        const json = require(pluginPath);

        if (!('plugin' in json)) {
          throw new Error(
            `'plugin' definition missing in plugin [${pluginPath}]`
          );
        }

        if (!('dependencies' in json)) {
          throw new Error(
            `'dependencies' missing in plugin [${pluginPath}], must be '[]' if no dependencies`
          );
        }

        if (!('configPath' in json)) {
          throw new Error(
            `'configPath' missing in plugin [${pluginPath}], must be set to 'undefined' if no config`
          );
        }

        // TODO validate these values

        const run = json.plugin;
        const dependencies = json.dependencies;
        const configPath = json.configPath;

        return new Plugin({ name, dependencies, run, configPath }, this.logger);
      });
  }

  isPluginEnabled<T, U>(plugin: Plugin<T, U>) {
    const { configPath } = plugin;

    if (configPath === undefined) {
      return Promise.resolve(true);
    }

    return this.configService.isEnabledAtPath(configPath);
  }
}
