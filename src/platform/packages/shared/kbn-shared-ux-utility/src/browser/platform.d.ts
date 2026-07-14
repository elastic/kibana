export type Platform = 'mac' | 'windows' | 'linux' | 'other';
/**
 * Checks if the current platform is macOS.
 */
export declare const isMac: boolean;
/**
 * Checks if the current platform is Windows.
 */
export declare const isWindows: boolean;
/**
 * Checks if the current platform is Linux.
 */
export declare const isLinux: boolean;
/**
 * Gets the current platform as a standardized string.
 */
export declare const getPlatform: () => Platform;
