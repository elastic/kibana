import { Reference as InternalReference } from '../internals';
export declare class Reference<T> {
    static isReference<V>(value: V | Reference<V> | undefined): value is Reference<V>;
    private readonly internalSchema;
    constructor(key: string);
    getSchema(): InternalReference;
}
//# sourceMappingURL=reference.d.ts.map