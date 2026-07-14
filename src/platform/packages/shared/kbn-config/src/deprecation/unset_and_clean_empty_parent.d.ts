/**
 * Unsets the path and checks if the parent property is an empty object.
 * If so, it removes the property from the config object (mutation is applied).
 *
 * @internal
 */
export declare const unsetAndCleanEmptyParent: (config: Record<string, unknown>, path: string | string[]) => void;
