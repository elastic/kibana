import type { TypeOf } from '@kbn/config-schema';
export declare const serializedValueSchema: import("@kbn/config-schema").Type<string | number | Readonly<{} & {
    from: string | number;
    to: string | number;
    type: "range_key";
    ranges: Readonly<{} & {
        from: string | number;
        to: string | number;
        label: string;
    }>[];
}> | Readonly<{} & {
    type: "multi_field_key";
    keys: string[];
}>>;
export type SerializableValueType = TypeOf<typeof serializedValueSchema>;
