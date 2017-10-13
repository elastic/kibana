import { readdir, stat } from 'fs';
import { resolve } from 'path';
import {
  Observable,
  k$,
  first,
  map,
  mergeMap,
  filter,
  toArray,
  toPromise,
  $bindNodeCallback,
  $fromPromise
} from 'kbn-observable';

import { Plugin } from './Plugin';
import { PluginName } from './types';
import { PluginSystem } from './PluginSystem';
import { PluginsConfig } from './PluginsConfig';
import { Logger, LoggerFactory } from '../../logging';
import { CoreService } from '../../types/CoreService';
import { ConfigService } from '../../config';

const fsReadDir$ = $bindNodeCallback(readdir);
const fsStat$ = $bindNodeCallback(stat);

export class PluginsService implements CoreService {
  private readonly log: Logger;

  constructor(
    private readonly pluginsConfig$: Observable<PluginsConfig>,
    private readonly pluginSystem: PluginSystem,
    private readonly configService: ConfigService,
    private readonly logger: LoggerFactory
  ) {
    this.log = this.logger.get('plugins');
  }

  async start() {
    const plugins = await k$(this.getAllPlugins())(
      mergeMap(
        plugin => $fromPromise(this.isPluginEnabled(plugin)),
        (plugin, isEnabled) => ({ plugin, isEnabled })
      ),
      filter(obj => {
        if (obj.isEnabled) {
          return true;
        }

        this.log.warn(
          `Plugin [${obj.plugin.name}] is disabled and will not be started`
        );

        return false;
      }),
      toArray(),
      toPromise()
    );

    plugins.forEach(plugin => {
      this.pluginSystem.addPlugin(plugin.plugin);
    });

    this.pluginSystem.startPlugins();
  }

  async stop() {
    this.pluginSystem.stopPlugins();
  }

  private getAllPlugins() {
    return k$(this.pluginsConfig$)(
      first(),
      mergeMap(config => config.scanDirs),
      mergeMap(
        dir => fsReadDir$(dir),
        (dir, pluginNames) =>
          pluginNames.map(pluginName => ({
            name: pluginName,
            path: resolve(dir, pluginName)
          }))
      ),
      mergeMap(plugins => plugins),
      mergeMap(
        plugin => fsStat$(plugin.path),
        (plugin, stat) => ({ ...plugin, isDir: stat.isDirectory() })
      ),
      filter(plugin => plugin.isDir),
      map(plugin => this.createPlugin(plugin.name, plugin.path))
    );
  }

  private createPlugin(name: PluginName, pluginPath: string) {
    const pathToRequire = resolve(pluginPath, 'target', 'server');
    const pluginExports = require(pathToRequire);

    if (!('plugin' in pluginExports)) {
      throw new Error(`'plugin' definition missing in plugin [${pluginPath}]`);
    }

    const { plugin } = pluginExports;

    if (!('plugin' in plugin)) {
      throw new Error(`'plugin' definition missing in plugin [${pluginPath}]`);
    }

    // TODO validate the values in `plugin` before instantiating `Plugin`

    return new Plugin(name, plugin, this.logger);
  }

  isPluginEnabled<T, U>(plugin: Plugin<T, U>) {
    const { configPath } = plugin;

    if (configPath === undefined) {
      return Promise.resolve(true);
    }

    return this.configService.isEnabledAtPath(configPath);
  }
}
