import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DashboardLocatorParams } from '../types';
/**
 * Removes keys with `undefined` values from a state object.
 * This mutates the original object and returns it.
 *
 * @param stateObj - The state object to clean.
 * @returns The same object with undefined keys removed.
 */
export declare const cleanEmptyKeys: (stateObj: Record<string, unknown>) => Record<string, unknown>;
export type DashboardAppLocator = LocatorPublic<DashboardLocatorParams>;
export interface DashboardAppLocatorDependencies {
    useHashedUrl: boolean;
    getDashboardFilterFields: (dashboardId: string) => Promise<Filter[]>;
}
export type ForwardedDashboardState = Omit<DashboardLocatorParams, 'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'>;
/**
 * Locator definition for the Dashboard application.
 * This class is responsible for generating URLs and navigation state for dashboard links.
 */
export declare class DashboardAppLocatorDefinition implements LocatorDefinition<DashboardLocatorParams> {
    protected readonly deps: DashboardAppLocatorDependencies;
    /** The unique identifier for the dashboard app locator. */
    readonly id = "DASHBOARD_APP_LOCATOR";
    /**
     * Creates a new DashboardAppLocatorDefinition.
     *
     * @param deps - The dependencies required for the locator.
     */
    constructor(deps: DashboardAppLocatorDependencies);
    /**
     * Generates the location for a dashboard based on the provided parameters.
     *
     * @param params - The {@link DashboardLocatorParams} to use for generating the location.
     * @returns A promise that resolves to the location object containing app, path, and state.
     */
    readonly getLocation: (params: DashboardLocatorParams) => Promise<{
        app: string;
        path: string;
        state: Record<string, unknown> & SerializableRecord;
    }>;
}
