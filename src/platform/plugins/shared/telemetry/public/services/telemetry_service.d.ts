import { type Observable } from 'rxjs';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { TelemetryPluginConfig } from '../plugin';
import type { UnencryptedTelemetryPayload, EncryptedTelemetryPayload } from '../../common/types/latest';
interface TelemetryServiceConstructor {
    config: TelemetryPluginConfig;
    http: CoreStart['http'];
    notifications: CoreSetup['notifications'];
    isScreenshotMode: boolean;
    currentKibanaVersion: string;
    reportOptInStatusChange?: boolean;
}
/**
 * Handles caching telemetry config in the user's session and requests the
 * backend to fetch telemetry payload requests or notify about config changes.
 */
export declare class TelemetryService {
    private readonly http;
    private readonly reportOptInStatusChange;
    private readonly notifications;
    private readonly defaultConfig;
    private readonly isScreenshotMode;
    private updatedConfig?;
    /**
     * Emits the opt-in status. It withholds the synchronous injected/default value and only starts
     * emitting once the config has been updated (i.e. the first value fetched from the server), then
     * emits again on every subsequent opt-in change (e.g. `setOptIn`).
     */
    private readonly isOptedIn$$;
    private configRefreshController?;
    private readonly refreshConfigRequests$;
    private readonly refreshedConfig$;
    /** Current version of Kibana */
    readonly currentKibanaVersion: string;
    constructor({ config, http, isScreenshotMode, notifications, currentKibanaVersion, reportOptInStatusChange, }: TelemetryServiceConstructor);
    /**
     * Config setter to locally persist the updated configuration.
     * Useful for caching the configuration throughout the users' session,
     * so they don't need to refresh the page.
     * @param updatedConfig
     */
    set config(updatedConfig: TelemetryPluginConfig);
    /** Returns the latest configuration **/
    get config(): TelemetryPluginConfig;
    /**
     * Fetches the latest telemetry config from the server and applies it to the local cache.
     *
     * Concurrency: refreshes are serialized with `exhaustMap`; callers that invoke this while a refresh
     * is in flight share the current refresh result instead of starting another HTTP request. `setOptIn`
     * aborts the in-flight request so a stale server snapshot cannot clobber the user's newer choice.
     * @returns The config that was applied (or the preserved local config if the fetch was aborted).
     */
    refreshConfig: () => Promise<TelemetryPluginConfig>;
    /**
     * Fetches the telemetry config from the server and merges it with the config already known locally.
     */
    private fetchUpdatedConfig;
    /**
     * Emits the user's opt-in preference.
     *
     * It withholds the synchronous injected/default value and emits the first time the config is
     * resolved from the server, then emits again whenever the preference changes. Replays the latest
     * value to late subscribers.
     */
    readonly isOptedIn$: Observable<boolean>;
    /** Is the cluster opted-in to telemetry **/
    get isOptedIn(): boolean;
    /** Changes the opt-in status **/
    set isOptedIn(optIn: boolean);
    /** true if the user has already seen the opt-in/out notice **/
    get userHasSeenOptedInNotice(): boolean | undefined;
    /** Changes the notice visibility options **/
    set userHasSeenOptedInNotice(telemetryNotifyUserAboutOptInDefault: boolean | undefined);
    /** Is the cluster allowed to change the opt-in/out status **/
    getCanChangeOptInStatus: () => boolean;
    /** Retrieve the opt-in/out notification URL **/
    getOptInStatusUrl: () => string;
    /** Retrieve the URL to report telemetry **/
    getTelemetryUrl: () => string;
    /**
     * Returns whether a user should be shown the notice about Opt-In/Out telemetry.
     * The decision is made based on:
     * 1. The config hidePrivacyStatement is unset
     * 2. The user has enough privileges to change the settings
     * 3. At least one of the following:
     *   * It is opted-in, and the user has already been notified at any given point in the deployment's life.
     *   * It is opted-out, and the user has been notified for this version (excluding patch updates)
     */
    getUserShouldSeeOptInNotice(): boolean;
    /** Is the user allowed to change the opt-in/out status **/
    get userCanChangeSettings(): boolean;
    /** Change the user's permissions to change the opt-in/out status **/
    set userCanChangeSettings(userCanChangeSettings: boolean);
    /**
     * Is the cluster opted-in to telemetry
     * @deprecated Subscribe to {@link TelemetryService.isOptedIn$ | isOptedIn$} instead. Reading this
     * synchronously at `start()` time or initial render may return the stale injected default before
     * the user's saved preference has been fetched from the server.
     */
    getIsOptedIn: () => boolean;
    /**
     * Are there any blockers for sending telemetry?
     * @deprecated Subscribe to {@link TelemetryService.canSendTelemetry$ | canSendTelemetry$} instead.
     * Reading this synchronously at `start()` time or initial render may return a value derived from the
     * stale injected default before the user's saved preference has been fetched from the server.
     */
    canSendTelemetry: () => boolean;
    /**
     * Emits whether telemetry can be sent: the user is opted in AND Kibana is not in a "skip" mode
     * (screenshot/synthetics). Like {@link TelemetryService.isOptedIn$ | isOptedIn$}, it withholds the
     * synchronous injected default and emits once the preference is resolved from the server, then on
     * every change. Replays the latest value to late subscribers.
     */
    readonly canSendTelemetry$: Observable<boolean>;
    fetchLastReported: () => Promise<number | undefined>;
    updateLastReported: () => Promise<number | undefined>;
    /** Fetches an unencrypted telemetry payload, so we can show it to the user **/
    fetchExample: () => Promise<UnencryptedTelemetryPayload>;
    /**
     * Fetches telemetry payload
     * @param unencrypted Default `false`. Whether the returned payload should be encrypted or not.
     * @param refreshCache Default `false`. Set to `true` to force the regeneration of the telemetry report.
     */
    fetchTelemetry: <T = EncryptedTelemetryPayload | UnencryptedTelemetryPayload>({ unencrypted, refreshCache, }?: {
        unencrypted?: boolean | undefined;
        refreshCache?: boolean | undefined;
    }) => Promise<T>;
    /**
     * Overwrite the opt-in status.
     * It will send a final request to the remote telemetry cluster to report about the opt-in/out change.
     * @param optedIn Whether the user is opting-in (`true`) or out (`false`).
     * @param signal An AbortSignal to cancel any ongoing requests if the caller decides to
     */
    setOptIn: (optedIn: boolean, signal?: AbortSignal) => Promise<boolean>;
    /**
     * Discards the notice about usage collection and stores it so we don't bother any other users.
     */
    setUserHasSeenNotice: () => Promise<void>;
    /**
     * Pushes the encrypted payload [{cluster_uuid, opt_in_status}] to the remote telemetry service
     * @param optInStatusPayload [{cluster_uuid, opt_in_status}] encrypted by the server into an array of strings
     * @param signal An AbortSignal to cancel the ongoing requests if the caller decides to
     */
    private reportOptInStatus;
}
export {};
