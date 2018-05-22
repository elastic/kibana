import {
  IKibanaSystemClassStatic,
  ISystemMetadata,
  ISystemsType,
  KibanaSystem,
  SystemName,
} from './system_types';

function isPromise(obj: any) {
  return (
    obj != null && typeof obj === 'object' && typeof obj.then === 'function'
  );
}

export class System<C, M extends ISystemMetadata, D extends ISystemsType, E> {
  public readonly name: SystemName;
  public readonly dependencies: SystemName[];
  public readonly metadata?: M;

  private readonly systemClass: IKibanaSystemClassStatic<C, D, E>;
  private systemInstance?: KibanaSystem<C, D, E>;
  private exposedValues?: E;

  constructor(
    name: SystemName,
    config: {
      metadata?: M;
      dependencies?: SystemName[];
      implementation: IKibanaSystemClassStatic<C, D, E>;
    }
  ) {
    this.name = name;
    this.dependencies = config.dependencies || [];
    this.metadata = config.metadata;
    this.systemClass = config.implementation;
  }

  public getExposedValues(): E {
    if (this.systemInstance === undefined) {
      throw new Error(
        'trying to get the exposed value of a system that is NOT running'
      );
    }

    return this.exposedValues!;
  }

  public start(kibanaValues: C, dependenciesValues: D) {
    this.systemInstance = new this.systemClass(
      kibanaValues,
      dependenciesValues
    );
    const exposedValues = this.systemInstance.start();

    if (isPromise(exposedValues)) {
      throw new Error(
        `A promise was returned when starting [${
          this.name
        }], but systems must start synchronously and return either return undefined or the contract they expose to other systems.`
      );
    }

    this.exposedValues =
      exposedValues === undefined ? ({} as E) : exposedValues;
  }

  public stop() {
    const stoppedResponse = this.systemInstance && this.systemInstance.stop();

    this.exposedValues = undefined;
    this.systemInstance = undefined;

    if (isPromise(stoppedResponse)) {
      throw new Error(
        `A promise was returned when stopping [${
          this.name
        }], but systems must stop synchronously.`
      );
    }
  }
}
