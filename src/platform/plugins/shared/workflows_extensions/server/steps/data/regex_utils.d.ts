export declare const MAX_INPUT_LENGTH = 100000;
export declare const MAX_PATTERN_LENGTH = 10000;
export declare const MAX_ARRAY_LENGTH = 10000;
/**
 * Validates that an input string does not exceed the maximum allowed length.
 * This helps prevent ReDoS attacks by limiting the size of input that can be
 * processed by regular expressions.
 */
export declare function validateInputLength(item: string, logger: {
    warn: (message: string) => void;
}): {
    valid: true;
} | {
    valid: false;
    error: Error;
};
/**
 * Detects potentially dangerous ReDoS (Regular Expression Denial of Service) patterns.
 * Checks for common vulnerable patterns that can cause catastrophic backtracking.
 *
 * @param pattern - The regex pattern to validate
 * @returns Error if a dangerous pattern is detected, undefined otherwise
 */
export declare function detectRedosPatterns(pattern: string): Error | undefined;
/**
 * Creates a RegExp object from a pattern string and optional flags.
 * Validates the pattern length and ReDoS vulnerabilities before creating the regex.
 *
 * @param pattern - The regex pattern string
 * @param flags - Optional regex flags (g, i, m, etc.)
 * @param logger - Logger for error messages
 * @returns Object containing either the created RegExp or an Error
 */
export declare function createRegex(pattern: string, flags: string | undefined, logger: {
    error: (message: string, error?: unknown) => void;
    warn?: (message: string) => void;
}): {
    regex: RegExp;
} | {
    error: Error;
};
/**
 * Validates that the source input is either a string or an array of appropriate size.
 * Prevents processing of excessively large arrays that could cause performance issues.
 */
export declare function validateSourceInput(source: unknown, logger: {
    error: (message: string) => void;
    warn?: (message: string) => void;
}): {
    valid: true;
    isArray: boolean;
} | {
    valid: false;
    error: Error;
};
