import {
  SystemsType,
  SystemName,
  SystemConfigPath,
  KibanaSystemClassStatic,
  KibanaSystem,
} from './system_types';

const noop = () => {};

function isPromise(obj: any) {
  return (
    obj != null && typeof obj === 'object' && typeof obj.then === 'function'
  );
}

export class System<C, D extends SystemsType, E> {
  readonly name: SystemName;
  readonly dependencies: SystemName[];
  readonly configPath?: SystemConfigPath;

  private readonly _implementation: KibanaSystemClassStatic<C, D, E>;
  private _systemInstance?: KibanaSystem<C, D, E>;
  private _exposedValues?: E;

  constructor(
    name: SystemName,
    config: {
      configPath?: SystemConfigPath;
      dependencies?: SystemName[];
      implementation: KibanaSystemClassStatic<C, D, E>;
    }
  ) {
    this.name = name;
    this.dependencies = config.dependencies || [];
    this.configPath = config.configPath;
    this._implementation = config.implementation;
  }

  getExposedValues(): E {
    if (this._systemInstance === undefined) {
      throw new Error(
        'trying to get the exposed value of a system that is NOT running'
      );
    }

    return this._exposedValues!;
  }

  start(kibanaValues: C, dependenciesValues: D) {
    this._systemInstance = new this._implementation(
      kibanaValues,
      dependenciesValues
    );
    const exposedValues = this._systemInstance.start();

    if (isPromise(exposedValues)) {
      throw new Error(
        `A promise was returned when starting [${
          this.name
        }], but systems must start synchronously and return either return undefined or the contract they expose to other systems.`
      );
    }

    this._exposedValues =
      exposedValues === undefined ? ({} as E) : exposedValues;
  }

  stop() {
    this._systemInstance && this._systemInstance.stop();
    this._exposedValues = undefined;
  }
}
