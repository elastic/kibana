import { SerializableField } from '../../../serializable_field';
import { SerializableType } from '../../../serialize_utils';
type Ranges = Array<Partial<{
    from: string | number | null;
    to: string | number | null;
    label: string;
}>>;
/**
 * Serialized form of {@link @kbn/data-plugin/common.RangeKey}
 */
export interface SerializedRangeKey {
    type: typeof SerializableType.RangeKey;
    from: string | number | null;
    to: string | number | null;
    ranges: Ranges;
}
export declare class RangeKey extends SerializableField<SerializedRangeKey> {
    static isInstance(field: unknown): field is RangeKey;
    static deserialize(value: SerializedRangeKey): RangeKey;
    static idBucket(bucket: unknown): string;
    static isRangeKeyString(rangeKey: string): boolean;
    /**
     * Returns `RangeKey` from stringified form. Cannot extract labels from stringified form.
     *
     * Only supports numerical (non-string) values.
     */
    static fromString(rangeKey: string): RangeKey;
    gte: string | number;
    lt: string | number;
    label?: string;
    constructor(bucket: unknown, allRanges?: Ranges);
    toString(): string;
    serialize(): SerializedRangeKey;
}
export {};
