import type { ApmBase } from '@elastic/apm-rum';
import type { Plugin, CoreStart, CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import type { ScreenshotModePluginSetup, ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
/**
 * Publicly exposed APIs from the Telemetry Service
 */
export interface TelemetryServicePublicApis {
    /** Is the cluster opted-in to telemetry? **/
    getIsOptedIn: () => boolean | null;
    /** Is the user allowed to change the opt-in/out status? **/
    userCanChangeSettings: boolean;
    /** Can phone-home telemetry calls be made? This depends on whether we have opted-in or if we are rendering a report */
    canSendTelemetry: () => boolean;
    /** Is the cluster allowed to change the opt-in/out status? **/
    getCanChangeOptInStatus: () => boolean;
    /** Fetches an unencrypted telemetry payload so we can show it to the user **/
    fetchExample: () => Promise<unknown[]>;
    /**
     * Overwrite the opt-in status.
     * It will send a final request to the remote telemetry cluster to report about the opt-in/out change.
     * @param optedIn Whether the user is opting-in (`true`) or out (`false`).
     * @param signal An AbortSignal to cancel any ongoing requests if the caller decides to
     */
    setOptIn: (optedIn: boolean, signal?: AbortSignal) => Promise<boolean>;
}
/**
 * Public's setup exposed APIs by the telemetry plugin
 */
export interface TelemetryPluginSetup {
    /** {@link TelemetryService} **/
    telemetryService: TelemetryServicePublicApis;
}
/**
 * Public's start exposed APIs by the telemetry plugin
 */
export interface TelemetryConstants {
    /** Elastic's privacy statement url **/
    getPrivacyStatementUrl: () => string;
}
export interface TelemetryPluginStart {
    /** {@link TelemetryServicePublicApis} **/
    telemetryService: TelemetryServicePublicApis;
    /** Notification helpers **/
    telemetryNotifications: {
        /** Notify that the user has been presented with the opt-in/out notice. */
        setOptedInNoticeSeen: () => Promise<void>;
    };
    /** Set of publicly exposed telemetry constants **/
    telemetryConstants: TelemetryConstants;
}
interface TelemetryPluginSetupDependencies {
    screenshotMode: ScreenshotModePluginSetup;
    home?: HomePublicPluginSetup;
}
interface TelemetryPluginStartDependencies {
    screenshotMode: ScreenshotModePluginStart;
}
declare global {
    interface Window {
        elasticApm?: ApmBase;
    }
}
/**
 * Public-exposed configuration
 */
export interface TelemetryPluginConfig {
    /** The banner is expected to be shown when needed **/
    banner: boolean;
    /** Does the cluster allow changing the opt-in/out status via the UI? **/
    allowChangingOptInStatus: boolean;
    /** Is the cluster opted-in? **/
    optIn: boolean | null;
    /** Specify if telemetry should send usage to the prod or staging remote telemetry service **/
    sendUsageTo: 'prod' | 'staging';
    /** Should the telemetry payloads be sent from the server or the browser? **/
    sendUsageFrom: 'browser' | 'server';
    /** Should notify the user about the opt-in status? **/
    telemetryNotifyUserAboutOptInDefault?: boolean;
    /** Does the user have enough privileges to change the settings? **/
    userCanChangeSettings?: boolean;
    /** Should we hide the privacy statement notice? Useful on some environments, e.g. Cloud */
    hidePrivacyStatement?: boolean;
    /** Extra labels to add to the telemetry context */
    labels: Record<string, unknown>;
    /** Whether to use Serverless-specific channels when reporting Snapshot Telemetry */
    appendServerlessChannelsSuffix: boolean;
    /** Should use the local EBT shipper to persist events in the local ES */
    localShipper: boolean;
}
export declare class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart, TelemetryPluginSetupDependencies, TelemetryPluginStartDependencies> {
    private readonly currentKibanaVersion;
    private readonly config;
    private readonly telemetryLabels$;
    private telemetrySender?;
    private telemetryNotifications?;
    private telemetryService?;
    private canUserChangeSettings;
    constructor(initializerContext: PluginInitializerContext<TelemetryPluginConfig>);
    setup(coreSetup: CoreSetup, { screenshotMode, home }: TelemetryPluginSetupDependencies): TelemetryPluginSetup;
    start({ analytics, http, overlays, application, docLinks, ...startServices }: CoreStart, { screenshotMode }: TelemetryPluginStartDependencies): TelemetryPluginStart;
    stop(): void;
    private getSendToEnv;
    /**
     * Kibana should skip telemetry collection if reporting is taking a screenshot
     * or Synthetics monitoring is navigating Kibana.
     * @param screenshotMode {@link ScreenshotModePluginSetup}
     * @internal
     */
    private shouldSkipTelemetry;
    private getTelemetryServicePublicApis;
    /**
     * Retrieve the up-to-date configuration
     * @param http HTTP helper to make requests to the server
     * @internal
     */
    private refreshConfig;
    /**
     * Can the user edit the saved objects?
     * This is a security feature, not included in the OSS build, so we need to fallback to `true`
     * in case it is `undefined`.
     * @param application CoreStart.application
     * @internal
     */
    private getCanUserChangeSettings;
    private getIsUnauthenticated;
    private maybeStartTelemetryPoller;
    private maybeShowOptedInNotificationBanner;
    /**
     * Fetch configuration from the server and merge it with the one the browser already knows
     * @param http The HTTP helper to make the requests
     * @internal
     */
    private fetchUpdatedConfig;
}
export {};
