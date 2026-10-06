import type { Newable } from 'inversify';
import type { App, AppMount, AppMountParameters } from '@kbn/core-application-browser';
import type { ServiceToken } from '@kbn/core-di';
/**
 * The browser application definition.
 * @public
 */
export interface ApplicationDefinition<HistoryLocationState = unknown> extends Omit<App<HistoryLocationState>, 'mount'>, Newable<ApplicationHandler<HistoryLocationState>> {
}
/**
 * The browser application mount handler.
 * @public
 */
export interface ApplicationHandler<HistoryLocationState = unknown> {
    /**
     * The mount function that will be called when the application is mounted.
     * The mount parameters can be injected using {@link ApplicationParameters}.
     */
    mount(): ReturnType<AppMount<HistoryLocationState>>;
}
/**
 * The service identifier that is used to register the application.
 * @public
 */
export declare const Application: ServiceToken<ApplicationDefinition & Exclude<ServiceToken<ApplicationHandler>, keyof any>>;
/**
 * The service identifier of the application mount parameters.
 * @public
 */
export declare const ApplicationParameters: ServiceToken<AppMountParameters>;
