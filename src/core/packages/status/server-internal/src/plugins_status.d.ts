import type { Observable } from 'rxjs';
import type { PluginName } from '@kbn/core-base-common';
import { type CoreStatus, type ServiceStatus } from '@kbn/core-status-common';
import type { PluginStatus } from './types';
export interface Deps {
    core$: Observable<CoreStatus>;
    pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
}
export declare class PluginsStatusService {
    private readonly statusTimeoutMs;
    private coreStatus;
    private pluginData;
    private rootPlugins;
    private orderedPluginNames;
    private start$;
    private pluginData$;
    private pluginStatus;
    private pluginStatus$;
    private reportedStatusSubscriptions;
    private reportingStatus;
    private newRegistrationsAllowed;
    private coreSubscription;
    constructor(deps: Deps, statusTimeoutMs?: number);
    /**
     * Register a status Observable for a specific plugin
     * @param {PluginName} plugin The name of the plugin
     * @param {Observable<ServiceStatus>} status$ An external Observable that must be trusted as the source of truth for the status of the plugin
     * @throws An error if the status registrations are not allowed
     */
    set(plugin: PluginName, status$: Observable<ServiceStatus>): void;
    start(): void;
    /**
     * Obtain an Observable of the status of all the plugins
     * @returns {Observable<Record<PluginName, PluginStatus>>} An Observable that will yield the current status of all plugins
     */
    getAll$(): Observable<Record<PluginName, PluginStatus>>;
    /**
     * Obtain an Observable of the status of the dependencies of the given plugin
     * @param {PluginName} plugin the name of the plugin whose dependencies' status must be retreived
     * @returns {Observable<Record<PluginName, PluginStatus>>} An Observable that will yield the current status of the plugin's dependencies
     */
    getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, PluginStatus>>;
    /**
     * Obtain an Observable of the derived status of the given plugin
     * @param {PluginName} plugin the name of the plugin whose derived status must be retrieved
     * @returns {Observable<PluginStatus>} An Observable that will yield the derived status of the plugin
     */
    getDerivedStatus$(plugin: PluginName): Observable<PluginStatus>;
    /**
     * Hook to be called at the stop lifecycle event
     */
    stop(): void;
    /**
     * Initialize a convenience data structure
     * that maintain up-to-date information about the plugins and their statuses
     * @param {ReadonlyMap<PluginName, PluginName[]>} pluginDependencies Information about the different plugins and their dependencies
     * @returns {PluginData}
     */
    private initPluginData;
    /**
     * Create a list with all the root plugins.
     * Root plugins are all those plugins that do not have any dependency.
     * @returns {PluginName[]} a list with all the root plugins present in the provided deps
     */
    private getRootPlugins;
    /**
     * Updates the root plugins statuses according to the current core services status
     */
    private updateRootPluginsStatuses;
    /**
     * Update the derived statuses of the specified plugins' dependant plugins,
     * If impacted plugins have not registered a custom status Observable, update their "current" status as well.
     * @param {PluginName[]} plugins The names of the plugins whose dependant plugins must be updated
     */
    private updateDependantStatuses;
    /**
     * Determine the derived status of the specified plugin and update it on the pluginData structure
     * Optionally, if the plugin has not registered a custom status Observable, update its "current" status as well
     * @param {PluginName} plugin The name of the plugin to be updated
     */
    private updatePluginsStatus;
    /**
     * Determine the plugin's derived status (taking into account dependencies and core services)
     * @param {PluginName} pluginName the name of the plugin whose status must be determined
     * @returns {PluginStatus} The status of the plugin
     */
    private determineDerivedStatus;
    /**
     * Updates the reported status for the given plugin.
     * @param {PluginName} pluginName The name of the plugin whose reported status must be updated
     * @param {ServiceStatus} status The newly reported status for that plugin
     * @return {Object} indicating whether the level and/or the summary have changed
     */
    private updatePluginReportedStatus;
    /**
     * Emit the current status to internal Subjects, effectively propagating it to observers.
     */
    private emitCurrentStatus;
}
