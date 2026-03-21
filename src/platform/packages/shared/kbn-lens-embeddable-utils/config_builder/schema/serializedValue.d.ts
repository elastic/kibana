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
    keys: string[];
    type: "multi_field_key";
}>>;
export type SerializableValueType = TypeOf<typeof serializedValueSchema>;
