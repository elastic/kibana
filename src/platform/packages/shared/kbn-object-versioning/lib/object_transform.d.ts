import type { ObjectMigrationDefinition, Version } from './types';
/**
 * Initiate a transform for a specific request version. After we initiate the transforms
 * for a specific version we can then pass different `ObjectMigrationDefinition` to the provided
 * handler to start up/down transforming different object based on this request version.
 *
 * @example
 *
 * ```ts
 * const transforms = initTransform(2); // start from version "2"
 * const fooTransforms = transforms(fooMigrationDefinition);
 * const barTransforms = transforms(barMigrationDefinition);
 *
 * // Up transform the objects to the latest, starting from version "2"
 * const { value: fooOnLatest } = foo.up();
 * const { value: barOnLatest } = bar.up();
 * ```
 *
 * @param requestVersion The starting version before up/down transforming
 * @returns A handler to pass an object migration definition
 */
export declare const initTransform: <UpIn = unknown, UpOut = unknown, DownIn = unknown, DownOut = unknown>(requestVersion: Version) => (migrationDefinition: ObjectMigrationDefinition) => {
    up: <I = UpIn, O = UpOut>(obj: I, to?: number | "latest", { validate }?: {
        validate?: boolean;
    }) => {
        error: Error;
        value: null;
    } | {
        value: O;
        error: null;
    };
    down: <I = DownIn, O_1 = DownOut>(obj: I, from?: number | "latest", { validate }?: {
        validate?: boolean;
    }) => {
        error: Error;
        value: null;
    } | {
        value: any;
        error: null;
    };
    validate: (value: unknown, version?: number) => Error | null;
};
