import { SchemaTypeError } from '../errors';
import { Type, TypeOptions } from './type';
export declare type RecordOfOptions<K extends string, V> = TypeOptions<Record<K, V>>;
export declare class RecordOfType<K extends string, V> extends Type<Record<K, V>> {
    constructor(keyType: Type<K>, valueType: Type<V>, options?: RecordOfOptions<K, V>);
    protected handleError(type: string, { entryKey, reason, value }: Record<string, any>, path: string[]): string | SchemaTypeError | undefined;
}
//# sourceMappingURL=record_type.d.ts.map