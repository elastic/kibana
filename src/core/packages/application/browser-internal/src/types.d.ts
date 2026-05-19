import type { Observable } from 'rxjs';
import type { History } from 'history';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { App, AppMount, ApplicationSetup, ApplicationStart } from '@kbn/core-application-browser';
/** @internal */
export interface Mounter {
    appRoute: string;
    appBasePath: string;
    mount: AppMount;
    exactRoute: boolean;
    unmountBeforeMounting?: boolean;
}
/** @internal */
export interface ParsedAppUrl {
    app: string;
    path?: string;
}
/** @internal */
export interface InternalApplicationSetup extends Pick<ApplicationSetup, 'registerAppUpdater'> {
    /**
     * Register an mountable application to the system.
     * @param plugin - opaque ID of the plugin that registers this application
     * @param app
     */
    register<HistoryLocationState = unknown>(plugin: PluginOpaqueId, app: App<HistoryLocationState>): void;
}
/** @internal */
export interface InternalApplicationStart extends ApplicationStart {
    getComponent(): JSX.Element | null;
    /**
     * The potential action menu set by the currently mounted app.
     * Consumed by the chrome header.
     *
     * @internal
     */
    currentActionMenu$: Observable<MountPoint | undefined>;
    /**
     * The global history instance, exposed only to Core.
     * @internal
     */
    history: History<unknown>;
}
