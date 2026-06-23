import type { SchemaTypeError } from '../errors';
import type { TypeOptions, ExtendsDeepOptions, UnknownOptions } from './type';
import { Type } from './type';
export type MapOfOptions<K, V> = TypeOptions<Map<K, V>> & UnknownOptions;
export declare class MapOfType<K, V> extends Type<Map<K, V>> {
    private readonly keyType;
    private readonly valueType;
    private readonly mapOptions;
    constructor(keyType: Type<K>, valueType: Type<V>, options?: MapOfOptions<K, V>);
    extendsDeep(options: ExtendsDeepOptions): MapOfType<K, V>;
    protected handleError(type: string, { entryKey, reason, value }: Record<string, any>, path: string[]): string | SchemaTypeError | undefined;
}
