export declare const KBN_SCREENSHOT_MODE_ENABLED_KEY = "__KBN_SCREENSHOT_MODE_ENABLED_KEY__";
declare global {
    interface Window {
        [KBN_SCREENSHOT_MODE_ENABLED_KEY]?: boolean;
    }
}
/**
 * This function is responsible for detecting whether we are currently in screenshot mode.
 *
 * We check in the current window context whether screenshot mode is enabled, otherwise we check
 * localStorage. The ability to set a value in localStorage enables more convenient development and testing
 * in functionality that needs to detect screenshot mode.
 */
export declare const getScreenshotMode: () => boolean;
/**
 * Use this function to set the current browser to screenshot mode.
 *
 * This function should be called as early as possible to ensure that screenshot mode is
 * correctly detected for the first page load. It is not suitable for use inside any plugin
 * code unless the plugin code is guaranteed to, somehow, load before any other code.
 *
 * Additionally, we don't know what environment this code will run in so we remove as many external
 * references as possible to make it portable. For instance, running inside puppeteer.
 */
export declare const setScreenshotModeEnabled: () => void;
export declare const setScreenshotModeDisabled: () => void;
