import type { Plugin, CoreSetup } from '@kbn/core/server';
import type { ScreenshotModeServerSetup, ScreenshotModeServerStart, ScreenshotModeServerSetupDependencies, ScreenshotModeServerStartDependencies } from './types';
export declare class ScreenshotModePlugin implements Plugin<ScreenshotModeServerSetup, ScreenshotModeServerStart, ScreenshotModeServerSetupDependencies, ScreenshotModeServerStartDependencies> {
    setup(core: CoreSetup): ScreenshotModeServerSetup;
    start(): ScreenshotModeServerStart;
    stop(): void;
}
