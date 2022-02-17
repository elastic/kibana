/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { MigrateFunctionsObject } from 'src/plugins/kibana_utils/common';
import { SavedObjectReference } from 'kibana/server';
import type { LocatorDependencies } from './locator';
import type { LocatorDefinition, LocatorPublic, ILocatorClient, LocatorData } from './types';
import { Locator } from './locator';
import { LocatorMigrationFunction, LocatorsMigrationMap } from '.';

export type LocatorClientDependencies = LocatorDependencies;

export class LocatorClient implements ILocatorClient {
  /**
   * Collection of registered locators.
   */
  protected locators: Map<string, Locator<any>> = new Map();

  constructor(protected readonly deps: LocatorClientDependencies) {}

  /**
   * Creates and register a URL locator.
   *
   * @param definition A definition of URL locator.
   * @returns A public interface of URL locator.
   */
  public create<P extends SerializableRecord>(definition: LocatorDefinition<P>): LocatorPublic<P> {
    const locator = new Locator<P>(definition, this.deps);

    this.locators.set(definition.id, locator);

    return locator;
  }

  /**
   * Returns a previously registered URL locator.
   *
   * @param id ID of a URL locator.
   * @returns A public interface of a registered URL locator.
   */
  public get<P extends SerializableRecord>(id: string): undefined | LocatorPublic<P> {
    return this.locators.get(id);
  }

  protected getOrThrow<P extends SerializableRecord>(id: string): LocatorPublic<P> {
    const locator = this.locators.get(id);
    if (!locator) throw new Error(`Locator [ID = "${id}"] is not registered.`);
    return locator;
  }

  public migrations(): { [locatorId: string]: MigrateFunctionsObject } {
    const migrations: { [locatorId: string]: MigrateFunctionsObject } = {};

    for (const locator of this.locators.values()) {
      migrations[locator.id] =
        typeof locator.migrations === 'function' ? locator.migrations() : locator.migrations;
    }

    return migrations;
  }

  // PersistableStateService<LocatorData> ----------------------------------------------------------

  public telemetry(
    state: LocatorData,
    collector: Record<string, unknown>
  ): Record<string, unknown> {
    for (const locator of this.locators.values()) {
      collector = locator.telemetry(state.state, collector);
    }

    return collector;
  }

  public inject(state: LocatorData, references: SavedObjectReference[]): LocatorData {
    const locator = this.getOrThrow(state.id);
    const filteredReferences = references
      .filter((ref) => ref.name.startsWith('params:'))
      .map((ref) => ({
        ...ref,
        name: ref.name.substr('params:'.length),
      }));
    return {
      ...state,
      state: locator.inject(state.state, filteredReferences),
    };
  }

  public extract(state: LocatorData): { state: LocatorData; references: SavedObjectReference[] } {
    const locator = this.getOrThrow(state.id);
    const extracted = locator.extract(state.state);
    return {
      state: {
        ...state,
        state: extracted.state,
      },
      references: extracted.references.map((ref) => ({
        ...ref,
        name: 'params:' + ref.name,
      })),
    };
  }

  public readonly getAllMigrations = (): LocatorsMigrationMap => {
    const locatorParamsMigrations = this.migrations();
    const locatorMigrations: LocatorsMigrationMap = {};
    const versions = new Set<string>();

    for (const migrationMap of Object.values(locatorParamsMigrations))
      for (const version of Object.keys(migrationMap)) versions.add(version);

    for (const version of versions.values()) {
      const migration: LocatorMigrationFunction = (locator) => {
        const locatorMigrationsMap = locatorParamsMigrations[locator.id];
        if (!locatorMigrationsMap) return locator;

        const migrationFunction = locatorMigrationsMap[version];
        if (!migrationFunction) return locator;

        return {
          ...locator,
          version,
          state: migrationFunction(locator.state),
        };
      };

      locatorMigrations[version] = migration;
    }

    return locatorMigrations;
  };
}
