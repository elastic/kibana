import { Readable } from 'stream';
/**
 *  Create a Readable stream that provides the items
 *  from a list as objects to subscribers
 *
 *  @param  {Array<any>} items - the list of items to provide
 *  @return {Readable}
 */
export declare function createListStream<T = any>(items?: T | T[]): Readable;
