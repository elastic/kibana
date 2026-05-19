export { setScreenshotModeEnabled, KBN_SCREENSHOT_MODE_HEADER, KBN_SCREENSHOT_MODE_ENABLED_KEY, } from '../common';
export type { ScreenshotModeRequestHandlerContext, ScreenshotModeServerSetup as ScreenshotModePluginSetup, ScreenshotModeServerStart as ScreenshotModePluginStart, } from './types';
export declare function plugin(): Promise<import("./plugin").ScreenshotModePlugin>;
