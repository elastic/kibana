import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export interface IntegrationsServiceSetupDeps {
    uiSettings: IUiSettingsClient;
}
/** @internal */
export declare class IntegrationsService implements CoreService {
    private readonly styles;
    private readonly moment;
    setup(): Promise<void>;
    start({ uiSettings }: IntegrationsServiceSetupDeps): Promise<void>;
    stop(): Promise<void>;
}
