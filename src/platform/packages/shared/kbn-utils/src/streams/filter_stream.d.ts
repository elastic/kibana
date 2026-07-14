import { Transform } from 'stream';
export declare function createFilterStream<T>(fn: (obj: T) => boolean): Transform;
