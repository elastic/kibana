export declare const getArgValues: (argv: string[], flag: string | string[]) => string[];
export declare const getArgValue: (argv: string[], flag: string | string[]) => string | undefined;
/**
 * Get all flags matching the provided prefix
 * @param argv List of arguments
 * @param flagPrefix Flag prefix to match (either identical or its subkeys)
 * @returns Array of [flag, value] pairs for the matching flags. The returned flags are cleaned up from the `--` prefix.
 */
export declare const getAllArgKeysValueWithPrefix: (argv: string[], flagPrefix: string) => Array<[string, string | undefined]>;
