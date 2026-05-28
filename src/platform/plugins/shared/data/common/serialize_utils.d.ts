import type { SerializedRangeKey } from './search';
import type { SerializedMultiFieldKey } from './search/aggs/buckets/multi_field_key';
import type { RawValue } from './serializable_field';
/**
 * All available serialized forms of complex/instance fields. Excludes non-complex/primitive fields.
 *
 * Use `SerializedValue` for all generalize serial values which includes non-complex/primitive fields.
 *
 * Currently includes:
 * - `RangeKey`
 * - `MultiFieldKey`
 */
export type SerializedField = SerializedMultiFieldKey | SerializedRangeKey;
/**
 * Alias for unknown serialized value. This value is what we store in the SO and app state
 * to persist the color assignment based on the raw row value.
 *
 * In most cases this is a `string` or `number` or plain `object`, in other cases this is an
 * object serialized from an instance of a given field (i.e. `RangeKey` or `MultiFieldKey`).
 */
export type SerializedValue = number | string | SerializedField | unknown;
export declare const SerializableType: {
    MultiFieldKey: "multiFieldKey";
    RangeKey: "rangeKey";
};
export declare function deserializeField(field: SerializedValue): unknown;
export declare function serializeField(field: RawValue): SerializedValue;
