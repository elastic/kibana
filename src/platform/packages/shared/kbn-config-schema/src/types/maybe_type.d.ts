import type { ExtendsDeepOptions } from './type';
import { Type } from './type';
export declare class MaybeType<V> extends Type<V | undefined> {
    private readonly maybeType;
    constructor(type: Type<V>);
    extendsDeep(options: ExtendsDeepOptions): MaybeType<V>;
}
