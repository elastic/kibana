import { readdir } from 'fs';
import { Observable } from 'rxjs';

import { Plugin } from './Plugin';
import { PluginSystem } from './PluginSystem';
import { Logger, LoggerFactory } from '../../logger';

const readDirAsObservable = Observable.bindNodeCallback(readdir);

export class PluginsService {
  private readonly log: Logger;

  constructor(
    private readonly pluginsDir: string,
    private readonly pluginSystem: PluginSystem,
    private readonly logger: LoggerFactory
  ) {
    this.log = this.logger.get('plugins');
  }

  start() {
    this.readPlugins().subscribe({
      next: plugin => {
        this.pluginSystem.addPlugin(plugin);
      },
      complete: () => {
        this.pluginSystem.startPlugins();
      }
    });
  }

  stop() {
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

        // TODO validate these values
        const plugin = json.plugin;
        const dependencies = json.dependencies || [];

        return new Plugin(name, dependencies, plugin, this.logger);
      });
  }
}
