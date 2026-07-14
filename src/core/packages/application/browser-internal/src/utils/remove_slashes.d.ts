/**
 * Utility to remove trailing, leading or duplicate slashes.
 * By default will only remove duplicates.
 */
export declare const removeSlashes: (url: string, { trailing, leading, duplicates, }?: {
    trailing?: boolean;
    leading?: boolean;
    duplicates?: boolean;
}) => string;
