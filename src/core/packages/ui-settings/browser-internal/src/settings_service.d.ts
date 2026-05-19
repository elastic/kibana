import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { SettingsStart, SettingsSetup } from '@kbn/core-ui-settings-browser';
export interface SettingsServiceDeps {
    http: InternalHttpSetup;
    injectedMetadata: InternalInjectedMetadataSetup;
}
/** @internal */
export declare class SettingsService {
    private uiSettingsApi?;
    private uiSettingsClient?;
    private uiSettingsGlobalClient?;
    private done$;
    setup({ http, injectedMetadata }: SettingsServiceDeps): SettingsSetup;
    start(): SettingsStart;
    stop(): void;
}
