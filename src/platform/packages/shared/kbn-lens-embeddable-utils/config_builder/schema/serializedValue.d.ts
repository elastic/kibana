import type { TypeOf } from '@kbn/config-schema';
export declare const serializedValueSchema: import("@kbn/config-schema").Type<string | number | Readonly<{} & {
    type: "range_key";
    from: string | number;
    to: string | number;
    ranges: Readonly<{} & {
        label: string;
        from: string | number;
        to: string | number;
    }>[];
}> | Readonly<{} & {
    type: "multi_field_key";
    keys: string[];
}>>;
export type SerializableValueType = TypeOf<typeof serializedValueSchema>;
