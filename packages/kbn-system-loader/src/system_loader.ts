import { getSortedSystemNames } from './sorted_systems';
import { System } from './system';
import { ISystemMetadata, ISystemsType, SystemName } from './system_types';

export type KibanaSystemApiFactory<C, M> = (
  name: SystemName,
  metadata?: M
) => C;

export class SystemLoader<C, M extends ISystemMetadata> {
  private readonly systems = new Map<SystemName, System<C, M, any, any>>();
  private startedSystems: SystemName[] = [];

  constructor(
    /**
     * Creates the Kibana system api for each system. It is called with
     * information about a system before it's started, and the return value will
     * be injected into the system at startup.
     */
    private readonly kibanaSystemApiFactory: KibanaSystemApiFactory<C, M>
  ) {}

  public addSystems(systemSpecs: Array<System<C, M, any, any>>) {
    systemSpecs.forEach(systemSpec => {
      this.addSystem(systemSpec);
    });
  }

  public addSystem<D extends ISystemsType, E = void>(
    system: System<C, M, D, E>
  ) {
    if (this.systems.has(system.name)) {
      throw new Error(`a system named [${system.name}] has already been added`);
    }

    this.systems.set(system.name, system);
  }

  public startSystems() {
    this._ensureAllSystemDependenciesCanBeResolved();

    getSortedSystemNames(this.systems)
      .map(systemName => this.systems.get(systemName)!)
      .forEach(systemSpec => {
        this.startSystem(systemSpec);
      });
  }

  /**
   * Stop all systems in the reverse order of when they were started
   */
  public stopSystems() {
    this.startedSystems
      .map(systemName => this.systems.get(systemName)!)
      .reverse()
      .forEach(system => {
        system.stop();
        this.systems.delete(system.name);
      });

    this.startedSystems = [];
  }

  private _ensureAllSystemDependenciesCanBeResolved() {
    for (const [systemName, system] of this.systems) {
      for (const systemDependency of system.dependencies) {
        if (!this.systems.has(systemDependency)) {
          throw new Error(
            `System [${systemName}] depends on [${systemDependency}], which is not present`
          );
        }
      }
    }
  }

  private startSystem<D extends ISystemsType, E = void>(
    system: System<C, M, D, E>
  ) {
    const dependenciesValues = {} as D;

    for (const dependency of system.dependencies) {
      dependenciesValues[dependency] = this.systems
        .get(dependency)!
        .getExposedValues();
    }

    const kibanaSystemApi = this.kibanaSystemApiFactory(
      system.name,
      system.metadata
    );

    system.start(kibanaSystemApi, dependenciesValues);
    this.startedSystems.push(system.name);
  }
}
