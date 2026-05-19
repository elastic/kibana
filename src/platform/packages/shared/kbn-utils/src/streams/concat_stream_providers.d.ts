import type { Readable, TransformOptions } from 'stream';
import type { PassThrough } from 'stream';
/**
 *  Write the data and errors from a list of stream providers
 *  to a single stream in order. Stream providers are only
 *  called right before they will be consumed, and only one
 *  provider will be active at a time.
 *
 *  @param {Array<() => ReadableStream>} sourceProviders
 *  @param {PassThroughOptions} options options passed to the PassThrough constructor
 *  @return {WritableStream} combined stream
 */
export declare function concatStreamProviders(sourceProviders: Array<() => Readable>, options?: TransformOptions): PassThrough;
