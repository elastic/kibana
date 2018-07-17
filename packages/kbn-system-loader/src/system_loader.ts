/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getSortedSystemNames } from './sorted_systems';
import { System } from './system';
import { SystemMetadata, SystemName, SystemsType } from './system_types';

export type KibanaSystemApiFactory<C, M> = (name: SystemName, metadata?: M) => C;

export class SystemLoader<C, M extends SystemMetadata> {
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

  public addSystem<D extends SystemsType, E = void>(system: System<C, M, D, E>) {
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

  private startSystem<D extends SystemsType, E = void>(system: System<C, M, D, E>) {
    const dependenciesValues = {} as D;

    for (const dependency of system.dependencies) {
      dependenciesValues[dependency] = this.systems.get(dependency)!.getExposedValues();
    }

    const kibanaSystemApi = this.kibanaSystemApiFactory(system.name, system.metadata);

    system.start(kibanaSystemApi, dependenciesValues);
    this.startedSystems.push(system.name);
  }
}
