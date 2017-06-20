import { Plugin } from './Plugin';
import { PluginName, BasePluginsType } from './types';
import { KibanaCoreModules } from '../../types';
import { Logger, LoggerFactory } from '../../logger';
import { topologicalSort } from '../../lib/topologicalSort';

// We need this helper for the types to be correct
// (otherwise it assumes an array of A|B instead of a tuple [A,B])
const toTuple = <A, B>(a: A, b: B): [A, B] => [a, b];

function toSortable(plugins: Map<PluginName, Plugin<any, any>>) {
  const dependenciesByPlugin = [...plugins.entries()]
    .map(([name, plugin]) => toTuple(name, plugin.dependencies || []));
  return new Map<string, string[]>(dependenciesByPlugin);
}

function getSortedPluginNames(plugins: Map<PluginName, Plugin<any, any>>) {
  const sorted = topologicalSort(toSortable(plugins));
  return [...sorted];
}

export class PluginSystem {
  private readonly plugins = new Map<PluginName, Plugin<any, any>>();
  private readonly log: Logger;

  constructor(
    private readonly kibanaModules: KibanaCoreModules,
    logger: LoggerFactory
  ) {
    this.log = logger.get('pluginsystem');
  }

  addPlugin<
    DependenciesType extends BasePluginsType,
    ExposableType = void
  >(plugin: Plugin<DependenciesType, ExposableType>) {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`a plugin named [${plugin.name}] has already been added`);
    }

    this.log.debug(`adding plugin [${plugin.name}]`);
    this.plugins.set(plugin.name, plugin);
  }

  startPlugins() {
    const sortedPlugins = getSortedPluginNames(this.plugins);

    this.log.info(
      `starting [${this.plugins.size}] plugins: [${sortedPlugins}]`
    );

    sortedPlugins
      .map(pluginName => this.plugins.get(pluginName)!)
      .forEach(plugin => {
        this.startPlugin(plugin);
      });
  }

  private startPlugin<
    DependenciesType extends BasePluginsType,
    ExposableType = void
  >(plugin: Plugin<DependenciesType, ExposableType>) {
    const dependenciesValues = {} as DependenciesType;

    for (const dependency of plugin.dependencies) {
      dependenciesValues[dependency] = this.plugins.get(dependency)!.getExposedValues();
    }

    plugin.start(this.kibanaModules, dependenciesValues);
  }

  /**
   * Stop all plugins in the reverse order of when they were started
   */
  stopPlugins() {
    getSortedPluginNames(this.plugins)
      .map(pluginName => this.plugins.get(pluginName)!)
      .reverse()
      .forEach(plugin => {
        plugin.stop();
        this.plugins.delete(plugin.name);
      });
  }
}
