import type { FileMetadata } from '../../common';
export declare function createDefaultFileAttributes(): Pick<FileMetadata, 'created' | 'Updated' | 'Status'>;
export declare class FilesPluginError extends Error {
    readonly meta?: any | undefined;
    constructor(message: string, meta?: any | undefined);
}
interface WrapErrorAndReThrowInterface {
    (e: Error, messagePrefix?: string): never;
    withMessagePrefix: (messagePrefix: string) => (e: Error) => never;
}
/**
 * A helper method that can be used with Promises to wrap errors encountered with more details
 * info. Mainly useful with calls to SO/ES as those errors normally don't include a good stack
 * trace that points to where the error occurred.
 * @param e
 * @param messagePrefix
 */
export declare const wrapErrorAndReThrow: WrapErrorAndReThrowInterface;
export {};
