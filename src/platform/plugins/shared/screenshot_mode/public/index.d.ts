import { ScreenshotModePlugin } from './plugin';
export declare function plugin(): ScreenshotModePlugin;
export { KBN_SCREENSHOT_MODE_HEADER, setScreenshotModeEnabled, KBN_SCREENSHOT_MODE_ENABLED_KEY, } from '../common';
export type { ScreenshotModePublicSetup as ScreenshotModePluginSetup, ScreenshotModePublicStart as ScreenshotModePluginStart, } from './types';
