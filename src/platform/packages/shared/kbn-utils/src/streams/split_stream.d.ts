import type { Transform } from 'stream';
/**
 *  Creates a Transform stream that consumes a stream of Buffers
 *  and produces a stream of strings (in object mode) by splitting
 *  the received bytes using the splitChunk.
 *
 *  Ways this is behaves like String#split:
 *    - instances of splitChunk are removed from the input
 *    - splitChunk can be on any size
 *    - if there are no bytes found after the last splitChunk
 *      a final empty chunk is emitted
 *
 *  Ways this deviates from String#split:
 *    - splitChunk cannot be a regexp
 *    - an empty string or Buffer will not produce a stream of individual
 *      bytes like `string.split('')` would
 *
 *  @param  {String} splitChunk
 *  @return {Transform}
 */
export declare function createSplitStream(splitChunk: string | Uint8Array): Transform;
