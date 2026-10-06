export interface ScreenshotModePublicSetup {
    /**
     * Retrieves a value from the screenshotting context.
     * @param key Context key to get.
     * @param defaultValue Value to return if the key is not found.
     * @return The value stored in the screenshotting context.
     */
    getScreenshotContext<T = unknown>(key: string, defaultValue?: T): T | undefined;
    /**
     * Returns a boolean indicating whether the current user agent (browser) would like to view UI optimized for
     * screenshots or printing.
     */
    isScreenshotMode(): boolean;
}
export type ScreenshotModePublicStart = ScreenshotModePublicSetup;
export interface ScreenshotModePublicSetupDependencies {
}
export interface ScreenshotModePublicStartDependencies {
}
