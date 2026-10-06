import type { Observable } from 'rxjs';
import type { PluginName } from '@kbn/core-base-common';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { StatusServiceSetup } from '@kbn/core-status-server';
/** @internal */
export interface InternalStatusServiceSetup extends Pick<StatusServiceSetup, 'core$' | 'overall$' | 'isStatusPageAnonymous'> {
    /**
     * Overall status of core's service.
     */
    coreOverall$: Observable<ServiceStatus>;
    plugins: {
        set(plugin: PluginName, status$: Observable<ServiceStatus>): void;
        getDependenciesStatus$(plugin: PluginName): Observable<Record<string, ServiceStatus>>;
        getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus>;
    };
}
/** @internal */
export interface NamedStatus extends ServiceStatus {
    name: string;
}
/** @internal */
export interface NamedServiceStatus extends ServiceStatus, NamedStatus {
}
/** @internal */
export interface LoggableServiceStatus extends NamedServiceStatus {
    repeats?: number;
}
/** @internal */
export interface PluginStatus extends ServiceStatus {
    reported?: boolean;
}
/** @internal */
export interface NamedPluginStatus extends PluginStatus, NamedStatus {
}
/** @internal */
export interface LoggablePluginStatus extends PluginStatus, LoggableServiceStatus {
}
