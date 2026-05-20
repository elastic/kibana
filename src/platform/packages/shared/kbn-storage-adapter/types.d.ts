import type { MappingObjectProperty, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { Required } from 'utility-types';
type AllMappingPropertyType = Required<MappingProperty>['type'];
type StorageMappingPropertyType = AllMappingPropertyType & ('text' | 'match_only_text' | 'search_as_you_type' | 'keyword' | 'boolean' | 'date' | 'byte' | 'float' | 'double' | 'long' | 'object' | 'nested' | 'semantic_text' | 'flattened');
type StorageMappingPropertyObjectType = Required<MappingObjectProperty, 'type'>;
export type StorageMappingProperty = Extract<MappingProperty, {
    type: Exclude<StorageMappingPropertyType, 'object'>;
}> | StorageMappingPropertyObjectType;
type MappingPropertyOf<TType extends StorageMappingPropertyType> = Extract<StorageMappingProperty, {
    type: TType;
}>;
type MappingPropertyFactory<TType extends StorageMappingPropertyType, TDefaults extends Partial<MappingPropertyOf<TType> | undefined>> = <TOverrides extends Partial<MappingPropertyOf<TType>> | undefined>(overrides?: TOverrides) => MappingPropertyOf<TType> & Exclude<TDefaults, undefined> & Exclude<TOverrides, undefined>;
declare const types: {
    keyword: MappingPropertyFactory<"keyword", {
        ignore_above: number;
    }>;
    match_only_text: MappingPropertyFactory<"match_only_text", Partial<import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty> | undefined>;
    text: MappingPropertyFactory<"text", Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty> | undefined>;
    search_as_you_type: MappingPropertyFactory<"search_as_you_type", Partial<import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty> | undefined>;
    double: MappingPropertyFactory<"double", Partial<import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty> | undefined>;
    long: MappingPropertyFactory<"long", Partial<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty> | undefined>;
    boolean: MappingPropertyFactory<"boolean", Partial<import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty> | undefined>;
    date: MappingPropertyFactory<"date", {
        format: string;
    }>;
    byte: MappingPropertyFactory<"byte", Partial<import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty> | undefined>;
    float: MappingPropertyFactory<"float", Partial<import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty> | undefined>;
    object: MappingPropertyFactory<"object", Partial<StorageMappingPropertyObjectType> | undefined>;
    nested: MappingPropertyFactory<"nested", Partial<import("@elastic/elasticsearch/lib/api/types").MappingNestedProperty> | undefined>;
    semantic_text: MappingPropertyFactory<"semantic_text", Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty> | undefined>;
    flattened: MappingPropertyFactory<"flattened", Partial<import("@elastic/elasticsearch/lib/api/types").MappingFlattenedProperty> | undefined>;
};
type PrimitiveOf<TProperty extends StorageMappingProperty> = {
    keyword: TProperty extends {
        enum: infer TEnums;
    } ? TEnums extends Array<infer TEnum> ? TEnum : never : string | string[];
    match_only_text: string;
    text: string;
    search_as_you_type: string;
    boolean: boolean;
    date: TProperty extends {
        format: 'strict_date_optional_time';
    } ? string : string | number;
    double: number;
    long: number;
    byte: number;
    float: number;
    object: TProperty extends {
        properties: Record<string, StorageMappingProperty>;
    } ? {
        [key in keyof TProperty['properties']]?: StorageFieldTypeOf<TProperty['properties'][key]>;
    } : object;
    nested: TProperty extends {
        properties: Record<string, StorageMappingProperty>;
    } ? Array<{
        [key in keyof TProperty['properties']]?: StorageFieldTypeOf<TProperty['properties'][key]>;
    }> : Array<object>;
    semantic_text: string;
    flattened: Record<string, unknown>;
}[TProperty['type']];
export type StorageFieldTypeOf<TProperty extends StorageMappingProperty> = PrimitiveOf<TProperty>;
export { types };
