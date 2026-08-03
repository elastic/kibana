import { Transform, type TransformCallback } from 'stream';
import type { SupportedFileHashAlgorithm } from '../../../saved_objects/file';
declare class FileHashTransform extends Transform {
    private readonly algorithm;
    private readonly hash;
    private isFinished;
    private hashValue;
    constructor(algorithm?: SupportedFileHashAlgorithm);
    _transform(chunk: Buffer, _: BufferEncoding, next: TransformCallback): void;
    getFileHash(): {
        algorithm: SupportedFileHashAlgorithm;
        value: string;
    };
}
/**
 * Creates a `Transform` that will calculate a Hash based on the data provided by a Readable
 * @param algorithm
 */
export declare const createFileHashTransform: (algorithm?: SupportedFileHashAlgorithm) => FileHashTransform;
/**
 * Type guard to check of a given Transform is a `FileHashTransform`
 * @param transform
 */
export declare const isFileHashTransform: (transform: Transform) => transform is FileHashTransform;
export {};
