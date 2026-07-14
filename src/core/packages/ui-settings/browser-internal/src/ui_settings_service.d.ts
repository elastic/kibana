import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export interface UiSettingsServiceDeps {
    http: InternalHttpSetup;
    injectedMetadata: InternalInjectedMetadataSetup;
}
/**
 * @Internal
 * @Deprecated
 **/
export declare class UiSettingsService {
    private uiSettingsApi?;
    private uiSettingsClient?;
    private done$;
    setup({ http, injectedMetadata }: UiSettingsServiceDeps): IUiSettingsClient;
    start(): IUiSettingsClient;
    stop(): void;
}
