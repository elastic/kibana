import { readdir } from 'fs';
import { Observable } from 'rxjs';

import { Plugin } from './Plugin';
import { PluginSystem } from './PluginSystem';
import { Logger, LoggerFactory } from '../../logger';
import { CoreService } from '../../types';

const readDirAsObservable = Observable.bindNodeCallback(readdir);

export class PluginsService implements CoreService {
  private readonly log: Logger;

  constructor(
    private readonly pluginsDir: string,
    private readonly pluginSystem: PluginSystem,
    private readonly logger: LoggerFactory
  ) {
    this.log = this.logger.get('plugins');
  }

  async start() {
    await this.readPlugins()
      .do(plugin => {
        this.pluginSystem.addPlugin(plugin);
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

        // TODO validate these values

        const run = json.plugin;
        const dependencies = json.dependencies;

        return new Plugin({ name, dependencies, run }, this.logger);
      });
  }
}
