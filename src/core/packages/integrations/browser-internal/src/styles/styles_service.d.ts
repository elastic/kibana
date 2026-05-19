import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
interface StartDeps {
    uiSettings: IUiSettingsClient;
}
/** @internal */
export declare class StylesService implements CoreService {
    private uiSettingsSubscription?;
    setup(): Promise<void>;
    start({ uiSettings }: StartDeps): Promise<void>;
    stop(): Promise<void>;
}
export {};
