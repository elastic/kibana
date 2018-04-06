import {
  PluginsType,
  PluginName,
  PluginConfigPath,
  KibanaClassPluginStatic,
  KibanaPlugin,
} from './plugin';

const noop = () => {};

export class PluginSpec<C, D extends PluginsType, E> {
  readonly name: PluginName;
  readonly dependencies: PluginName[];
  readonly configPath?: PluginConfigPath;

  private readonly _pluginClass: KibanaClassPluginStatic<C, D, E>;
  private _pluginInstance?: KibanaPlugin<C, D, E>;
  private _exposedValues?: E;

  constructor(
    name: PluginName,
    config: {
      configPath?: PluginConfigPath;
      dependencies?: PluginName[];
      plugin: KibanaClassPluginStatic<C, D, E>;
    }
  ) {
    this.name = name;
    this.dependencies = config.dependencies || [];
    this.configPath = config.configPath;
    this._pluginClass = config.plugin;
  }

  getExposedValues(): E {
    if (this._pluginInstance === undefined) {
      throw new Error(
        'trying to get the exposed value of a plugin that is NOT running'
      );
    }

    return this._exposedValues!;
  }

  start(kibanaValues: C, dependenciesValues: D) {
    this._pluginInstance = new this._pluginClass(
      kibanaValues,
      dependenciesValues
    );
    const exposedValues = this._pluginInstance.start();

    // TODO throw if then-able? To make sure no one async/awaits while processing the plugin?
    // Or should we change this to _always_ `await pluginInstance.start()`?
    // if (isPromise(value)) {
    //   throw new Error('plugin cannot return a promise')
    // }

    this._exposedValues =
      exposedValues === undefined ? ({} as E) : exposedValues;
  }

  stop() {
    this._pluginInstance && this._pluginInstance.stop();
    this._exposedValues = undefined;
  }
}
