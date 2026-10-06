import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { FeedbackStart } from '@kbn/core-notifications-browser';
interface StartDeps {
    settings: SettingsStart;
}
export declare class FeedbackService {
    private settings?;
    start({ settings }: StartDeps): FeedbackStart;
}
export {};
