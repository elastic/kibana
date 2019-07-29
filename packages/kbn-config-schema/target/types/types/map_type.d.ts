import { SchemaTypeError } from '../errors';
import { Type, TypeOptions } from './type';
export declare type MapOfOptions<K, V> = TypeOptions<Map<K, V>>;
export declare class MapOfType<K, V> extends Type<Map<K, V>> {
    constructor(keyType: Type<K>, valueType: Type<V>, options?: MapOfOptions<K, V>);
    protected handleError(type: string, { entryKey, reason, value }: Record<string, any>, path: string[]): string | SchemaTypeError | undefined;
}
//# sourceMappingURL=map_type.d.ts.map