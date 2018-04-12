import { PluginSpec } from './plugin_spec';
import { PluginName, PluginConfigPath, PluginsType } from './plugin';
import { getSortedPluginNames } from './sorted_plugins';

export class PluginSystem<C> {
  private readonly _pluginSpecs = new Map<
    PluginName,
    PluginSpec<C, any, any>
  >();
  private _startedPlugins: PluginName[] = [];

  constructor(
    /**
     * Creates the Kibana plugin api for each plugin. Is called with plugin
     * information before plugin is started.
     */
    private readonly _kibanaPluginApiFactory: (
      name: PluginName,
      configPath?: PluginConfigPath
    ) => C
  ) {}

  addPluginSpecs(pluginSpecs: PluginSpec<C, any, any>[]) {
    pluginSpecs.forEach(pluginSpec => {
      this.addPluginSpec(pluginSpec);
    });
  }

  addPluginSpec<D extends PluginsType, E = void>(
    pluginSpec: PluginSpec<C, D, E>
  ) {
    if (this._pluginSpecs.has(pluginSpec.name)) {
      throw new Error(
        `a plugin named [${pluginSpec.name}] has already been added`
      );
    }

    this._pluginSpecs.set(pluginSpec.name, pluginSpec);
  }

  startPlugins() {
    this._ensureAllPluginDependenciesCanBeResolved();

    getSortedPluginNames(this._pluginSpecs)
      .map(pluginName => this._pluginSpecs.get(pluginName)!)
      .forEach(pluginSpec => {
        this.startPlugin(pluginSpec);
      });
  }

  private _ensureAllPluginDependenciesCanBeResolved() {
    for (const [pluginName, pluginSpec] of this._pluginSpecs) {
      for (const pluginDep of pluginSpec.dependencies) {
        if (!this._pluginSpecs.has(pluginDep)) {
          throw new Error(
            `Plugin [${pluginName}] depends on [${pluginDep}], which is not present`
          );
        }
      }
    }
  }

  private startPlugin<D extends PluginsType, E = void>(
    pluginSpec: PluginSpec<C, D, E>
  ) {
    const dependenciesValues = {} as D;

    for (const dependency of pluginSpec.dependencies) {
      dependenciesValues[dependency] = this._pluginSpecs
        .get(dependency)!
        .getExposedValues();
    }

    const kibanaPluginApi = this._kibanaPluginApiFactory(
      pluginSpec.name,
      pluginSpec.configPath
    );

    pluginSpec.start(kibanaPluginApi, dependenciesValues);
    this._startedPlugins.push(pluginSpec.name);
  }

  /**
   * Stop all plugins in the reverse order of when they were started
   */
  stopPlugins() {
    this._startedPlugins
      .map(pluginName => this._pluginSpecs.get(pluginName)!)
      .reverse()
      .forEach(pluginSpec => {
        pluginSpec.stop();
        this._pluginSpecs.delete(pluginSpec.name);
      });

    this._startedPlugins = [];
  }
}
