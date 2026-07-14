/**
 * The list of possible values for the dark mode UI setting.
 * - false: dark mode is disabled
 * - true: dark mode is enabled
 * - "system": dark mode will follow the user system preference.
 */
export type DarkModeValue = true | false | 'system';
export declare const parseDarkModeValue: (rawValue: unknown) => DarkModeValue;
