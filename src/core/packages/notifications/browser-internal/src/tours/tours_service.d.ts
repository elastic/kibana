import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ToursStart } from '@kbn/core-notifications-browser';
interface StartDeps {
    settings: SettingsStart;
}
export declare class ToursService {
    private settings?;
    start({ settings }: StartDeps): ToursStart;
}
export {};
