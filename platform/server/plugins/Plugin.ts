import {
  BasePluginsType,
  KibanaFunctionalPlugin,
  KibanaPluginStatic,
  PluginName
} from './types';
import { Logger, LoggerFactory } from '../../logger';
import { createKibanaValuesForPlugin } from './KibanaPluginValues';
import { KibanaCoreModules } from '../../types';

type LifecycleCallback = () => void;

// `isClass` is forked from https://github.com/miguelmota/is-class/blob/master/is-class.js
// MIT licensed, copyright 2014 Miguel Mota
var fnToString = Function.prototype.toString;

function fnBody(fn: any) {
  return fnToString
    .call(fn)
    .replace(/^[^{]*{\s*/, '')
    .replace(/\s*}[^}]*$/, '');
}

function isClass(fn: any) {
  return (
    typeof fn === 'function' &&
    (
      /^class\s/.test(fnToString.call(fn)) ||
      /^.*classCallCheck\(/.test(fnBody(fn)) // babel.js
    )
  );
}

function isKibanaFunctionalPlugin<
  DependenciesType extends BasePluginsType,
  ExposableType
>(
  val:
    | KibanaFunctionalPlugin<DependenciesType, ExposableType>
    | KibanaPluginStatic<DependenciesType, ExposableType>
): val is KibanaFunctionalPlugin<DependenciesType, ExposableType> {
  return !isClass(val);
}

interface PluginDefinition<DependenciesType, ExposableType> {
  name: string,
  dependencies: string[],
  run:
    | KibanaFunctionalPlugin<DependenciesType, ExposableType>
    | KibanaPluginStatic<DependenciesType, ExposableType>,
  configPath?: string | string []
}

export class Plugin<DependenciesType extends BasePluginsType, ExposableType> {
  readonly name: PluginName;
  readonly dependencies: PluginName[];
  private readonly run:
    | KibanaFunctionalPlugin<DependenciesType, ExposableType>
    | KibanaPluginStatic<DependenciesType, ExposableType>;
  readonly configPath: string | string[] | undefined;

  private stopCallbacks: LifecycleCallback[] = [];
  private exposedValues?: ExposableType;
  private log: Logger;

  constructor(
    pluginDefinition: PluginDefinition<DependenciesType, ExposableType>,
    logger: LoggerFactory
  ) {
    this.name = pluginDefinition.name as PluginName;
    this.dependencies = pluginDefinition.dependencies as PluginName[];
    this.run = pluginDefinition.run;
    this.configPath = pluginDefinition.configPath;
    this.log = logger.get('plugins', pluginDefinition.name);
  }

  getExposedValues(): ExposableType {
    if (this.exposedValues === undefined) {
      throw new Error(
        'trying to get the exposed value of a plugin that is NOT running'
      );
    }

    return this.exposedValues;
  }

  start(
    kibanaModules: KibanaCoreModules,
    dependenciesValues: DependenciesType
  ) {
    const kibanaValues = createKibanaValuesForPlugin(
      this.name,
      this.configPath,
      kibanaModules
    );

    this.log.info('starting plugin');

    let value: ExposableType;
    if (isKibanaFunctionalPlugin(this.run)) {
      value = this.run.call(null, kibanaValues, dependenciesValues);
    } else {
      const r = new this.run(kibanaValues, dependenciesValues);
      value = r.start();

      this.onStop(() => {
        r.stop && r.stop();
      });
    }

    // TODO throw if then-able? To make sure no one async/awaits while processing the plugin?
    // if (isPromise(value)) {
    //   throw new Error('plugin cannot return a promise')
    // }

    this.exposedValues = typeof value === 'undefined'
      ? {} as ExposableType
      : value;
  }

  private onStop(cb: LifecycleCallback) {
    this.stopCallbacks.push(cb);
  }

  stop() {
    this.log.info('stopping plugin');
    this.stopCallbacks.forEach(cb => cb());
    this.exposedValues = undefined;
  }
}
