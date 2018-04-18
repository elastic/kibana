import {
  SystemsType,
  SystemName,
  SystemMetadata,
  KibanaSystemClassStatic,
  KibanaSystem,
} from './system_types';

function isPromise(obj: any) {
  return (
    obj != null && typeof obj === 'object' && typeof obj.then === 'function'
  );
}

export class System<C, M extends SystemMetadata, D extends SystemsType, E> {
  readonly name: SystemName;
  readonly dependencies: SystemName[];
  readonly metadata?: M;

  private readonly _systemClass: KibanaSystemClassStatic<C, D, E>;
  private _systemInstance?: KibanaSystem<C, D, E>;
  private _exposedValues?: E;

  constructor(
    name: SystemName,
    config: {
      metadata?: M;
      dependencies?: SystemName[];
      implementation: KibanaSystemClassStatic<C, D, E>;
    }
  ) {
    this.name = name;
    this.dependencies = config.dependencies || [];
    this.metadata = config.metadata;
    this._systemClass = config.implementation;
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
    this._systemInstance = new this._systemClass(
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
    const stoppedResponse = this._systemInstance && this._systemInstance.stop();

    this._exposedValues = undefined;
    this._systemInstance = undefined;

    if (isPromise(stoppedResponse)) {
      throw new Error(
        `A promise was returned when stopping [${
          this.name
        }], but systems must stop synchronously.`
      );
    }
  }
}
