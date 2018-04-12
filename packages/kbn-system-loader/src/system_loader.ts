import { System } from './system';
import { SystemName, SystemConfigPath, SystemsType } from './system_types';
import { getSortedSystemNames } from './sorted_systems';

export class SystemLoader<C> {
  private readonly _systems = new Map<SystemName, System<C, any, any>>();
  private _startedSystems: SystemName[] = [];

  constructor(
    /**
     * Creates the Kibana system api for each system. Is called with system
     * information before system is started.
     */
    private readonly _kibanaSystemApiFactory: (
      name: SystemName,
      configPath?: SystemConfigPath
    ) => C
  ) {}

  addSystems(systemSpecs: System<C, any, any>[]) {
    systemSpecs.forEach(systemSpec => {
      this.addSystem(systemSpec);
    });
  }

  addSystem<D extends SystemsType, E = void>(system: System<C, D, E>) {
    if (this._systems.has(system.name)) {
      throw new Error(`a system named [${system.name}] has already been added`);
    }

    this._systems.set(system.name, system);
  }

  startSystems() {
    this._ensureAllSystemDependenciesCanBeResolved();

    getSortedSystemNames(this._systems)
      .map(systemName => this._systems.get(systemName)!)
      .forEach(systemSpec => {
        this.startSystem(systemSpec);
      });
  }

  private _ensureAllSystemDependenciesCanBeResolved() {
    for (const [systemName, system] of this._systems) {
      for (const systemDependency of system.dependencies) {
        if (!this._systems.has(systemDependency)) {
          throw new Error(
            `System [${systemName}] depends on [${systemDependency}], which is not present`
          );
        }
      }
    }
  }

  private startSystem<D extends SystemsType, E = void>(
    system: System<C, D, E>
  ) {
    const dependenciesValues = {} as D;

    for (const dependency of system.dependencies) {
      dependenciesValues[dependency] = this._systems
        .get(dependency)!
        .getExposedValues();
    }

    const kibanaSystemApi = this._kibanaSystemApiFactory(
      system.name,
      system.configPath
    );

    system.start(kibanaSystemApi, dependenciesValues);
    this._startedSystems.push(system.name);
  }

  /**
   * Stop all systems in the reverse order of when they were started
   */
  stopSystems() {
    this._startedSystems
      .map(systemName => this._systems.get(systemName)!)
      .reverse()
      .forEach(system => {
        system.stop();
        this._systems.delete(system.name);
      });

    this._startedSystems = [];
  }
}
