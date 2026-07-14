import { Transform } from 'stream';
export declare function createMapStream<T>(fn: (value: T, i: number) => void): Transform;
