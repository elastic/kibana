import type { SerializableRecord } from '@kbn/utility-types';
import type { DependencyList } from 'react';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { LocatorDefinition, LocatorPublic, KibanaLocation, LocatorNavigationParams, LocatorGetUrlParams } from './types';
import type { GetRedirectUrlOptions } from './redirect';
export interface LocatorDependencies {
    /**
     * Public URL of the Kibana server.
     */
    baseUrl?: string;
    /**
     * Current version of Kibana, e.g. `7.0.0`.
     */
    version?: string;
    /**
     * Navigate without reloading the page to a KibanaLocation.
     */
    navigate: (location: KibanaLocation, params?: LocatorNavigationParams) => Promise<void>;
    /**
     * Resolve a Kibana URL given KibanaLocation.
     */
    getUrl: (location: KibanaLocation, getUrlParams: LocatorGetUrlParams) => Promise<string>;
}
export declare class Locator<P extends SerializableRecord> implements LocatorPublic<P> {
    readonly definition: LocatorDefinition<P>;
    protected readonly deps: LocatorDependencies;
    readonly id: string;
    readonly migrations: PersistableState<P>['migrations'];
    constructor(definition: LocatorDefinition<P>, deps: LocatorDependencies);
    readonly telemetry: PersistableState<P>['telemetry'];
    readonly inject: PersistableState<P>['inject'];
    readonly extract: PersistableState<P>['extract'];
    getLocation(params: P): Promise<KibanaLocation>;
    getUrl(params: P, { absolute }?: LocatorGetUrlParams): Promise<string>;
    getRedirectUrl(params: P, options?: GetRedirectUrlOptions): string;
    navigate(params: P, { replace }?: LocatorNavigationParams): Promise<void>;
    navigateSync(locatorParams: P, navigationParams?: LocatorNavigationParams): void;
    readonly useUrl: (params: P, getUrlParams?: LocatorGetUrlParams, deps?: DependencyList) => string;
}
