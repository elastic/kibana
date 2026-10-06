import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ScreenshotModePublicSetup, ScreenshotModePublicSetupDependencies, ScreenshotModePublicStart, ScreenshotModePublicStartDependencies } from './types';
export declare class ScreenshotModePlugin implements Plugin<ScreenshotModePublicSetup, ScreenshotModePublicStart, ScreenshotModePublicSetupDependencies, ScreenshotModePublicStartDependencies> {
    private publicContract;
    setup(_core: CoreSetup): ScreenshotModePublicSetup;
    start(_core: CoreStart): ScreenshotModePublicStart;
    stop(): void;
}
