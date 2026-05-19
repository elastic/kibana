import type { $Keys } from 'utility-types';
declare const logLevelColors: {
    Emerg: string;
    Alert: string;
    Crit: string;
    Error: string;
    Warn: string;
    Notice: string;
    Info: string;
    Debug: string;
    Other: string;
};
type LogLevelKeys = $Keys<typeof logLevelColors>;
/**
 * Defines a palette to be used directly and does not fully implement IKbnPalette
 */
export declare const logLevelPalette: {
    id: "log_level";
    name: string;
    getColor: (key: LogLevelKeys) => string;
    colors: {
        Emerg: string;
        Alert: string;
        Crit: string;
        Error: string;
        Warn: string;
        Notice: string;
        Info: string;
        Debug: string;
        Other: string;
    };
};
export {};
