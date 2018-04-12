import {
  PluginsType,
  PluginName,
  PluginConfigPath,
  KibanaClassPluginStatic,
  KibanaPlugin,
} from './plugin';

const noop = () => {};

function isPromise(obj: any) {
  return (
    obj != null && typeof obj === 'object' && typeof obj.then === 'function'
  );
}

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

    if (isPromise(exposedValues)) {
      throw new Error(
        `A promise was returned when starting [${
          this.name
        }], but systems must start synchronously and return either return undefined or the contract they expose to other plugins.`
      );
    }

    this._exposedValues =
      exposedValues === undefined ? ({} as E) : exposedValues;
  }

  stop() {
    this._pluginInstance && this._pluginInstance.stop();
    this._exposedValues = undefined;
  }
}
