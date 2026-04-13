import { Type } from './type';
/**
 * Use this type to construct recursive runtime schemas.
 */
export declare class Lazy<T> extends Type<T> {
    constructor(id: string);
}
