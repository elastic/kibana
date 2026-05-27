/**
 * Returns the current UI-settings value.
 *
 * Usage:
 *
 * ```js
 * const darkMode = useUiSetting('theme:darkMode');
 * ```
 */
export declare const useUiSetting: <T>(key: string, defaultValue?: T) => T;
/**
 * Returns the current global UI-settings value.
 *
 * Usage:
 *
 * ```js
 * const customBranding = useGlobalUiSetting('customBranding:pageTitle');
 * ```
 */
export declare const useGlobalUiSetting: <T>(key: string, defaultValue?: T) => T;
type Setter<T> = (newValue: T) => Promise<boolean>;
/**
 * Returns a 2-tuple, where first entry is the setting value and second is a
 * function to update the setting value.
 *
 * Synchronously returns the most current value of the setting and subscribes
 * to all subsequent updates, which will re-render your component on new values.
 *
 * Usage:
 *
 * ```js
 * const [darkMode, setDarkMode] = useUiSetting$('theme:darkMode');
 * ```
 */
export declare const useUiSetting$: <T>(key: string, defaultValue?: T) => [T, Setter<T>];
/**
 * Returns a 2-tuple, where first entry is the setting value and second is a
 * function to update the setting value.
 *
 * Synchronously returns the most current value of the setting and subscribes
 * to all subsequent updates, which will re-render your component on new values.
 *
 * Usage:
 *
 * ```js
 * const [customBranding, setCustomBranding] = useGlobalUiSetting$('customBranding:pageTitle');
 * ```
 */
export declare const useGlobalUiSetting$: <T>(key: string, defaultValue?: T) => [T, Setter<T>];
export {};
