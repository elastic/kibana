import { SerializableField } from '../../../serializable_field';
import { SerializableType } from '../../../serialize_utils';
/**
 * Serialized form of {@link @kbn/data-plugin/common.MultiFieldKey}
 */
export interface SerializedMultiFieldKey {
    type: typeof SerializableType.MultiFieldKey;
    keys: string[];
}
export declare class MultiFieldKey extends SerializableField<SerializedMultiFieldKey> {
    static isInstance(field: unknown): field is MultiFieldKey;
    static deserialize(value: SerializedMultiFieldKey): MultiFieldKey;
    static idBucket(bucket: unknown): string;
    keys: string[];
    constructor(bucket: unknown);
    toString(): string;
    serialize(): SerializedMultiFieldKey;
}
/**
 * Multi-field key separator used in Visualizations (Lens, AggBased, TSVB).
 * This differs from the separator used in the toString method of the MultiFieldKey
 */
export declare const MULTI_FIELD_KEY_SEPARATOR = " \u203A ";
