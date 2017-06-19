import {
  BasePluginsType,
  KibanaFunctionalPlugin,
  KibanaPluginStatic
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

export class Plugin<DependenciesType extends BasePluginsType, ExposableType> {
  private stopCallbacks: LifecycleCallback[] = [];
  private exposedValues?: ExposableType;
  private log: Logger;

  // TODO If we end up not being super-dynamic about using `readdir` for reading
  // plugins in all locations we could consider making some of the types below
  // stricter (e.g. instead of typing `name` and `dependencies` as `string`
  // below , we can check them against `DependenciesType` and `ExposableType`),
  // See `git show 7e41eec17:platform/server/plugins/Plugin.ts`
  constructor(
    readonly name: string,
    readonly dependencies: string[],
    private readonly run:
      | KibanaFunctionalPlugin<DependenciesType, ExposableType>
      | KibanaPluginStatic<DependenciesType, ExposableType>,
    logger: LoggerFactory
  ) {
    this.log = logger.get('plugins', name);
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
