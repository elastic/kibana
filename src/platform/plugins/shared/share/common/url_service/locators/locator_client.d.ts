import type { SerializableRecord } from '@kbn/utility-types';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DependencyList } from 'react';
import type { LocatorDependencies } from './locator';
import type { LocatorDefinition, LocatorPublic, ILocatorClient, LocatorData, LocatorGetUrlParams } from './types';
import { Locator } from './locator';
import type { LocatorsMigrationMap } from '.';
export type LocatorClientDependencies = LocatorDependencies;
export declare class LocatorClient implements ILocatorClient {
    protected readonly deps: LocatorClientDependencies;
    /**
     * Collection of registered locators.
     */
    protected locators: Map<string, Locator<any>>;
    constructor(deps: LocatorClientDependencies);
    /**
     * Creates and register a URL locator.
     *
     * @param definition A definition of URL locator.
     * @returns A public interface of URL locator.
     */
    create<P extends SerializableRecord>(definition: LocatorDefinition<P>): LocatorPublic<P>;
    /**
     * Returns a previously registered URL locator.
     *
     * @param id ID of a URL locator.
     * @returns A public interface of a registered URL locator.
     */
    get<P extends SerializableRecord>(id: string): undefined | LocatorPublic<P>;
    readonly useUrl: <P extends SerializableRecord>(params: () => {
        id: string;
        params: P;
    }, deps?: DependencyList, getUrlParams?: LocatorGetUrlParams) => string | undefined;
    protected getOrThrow<P extends SerializableRecord>(id: string): LocatorPublic<P>;
    migrations(): {
        [locatorId: string]: MigrateFunctionsObject;
    };
    telemetry(state: LocatorData, collector: Record<string, unknown>): Record<string, unknown>;
    inject(state: LocatorData, references: SavedObjectReference[]): LocatorData;
    extract(state: LocatorData): {
        state: LocatorData;
        references: SavedObjectReference[];
    };
    readonly getAllMigrations: () => LocatorsMigrationMap;
}
