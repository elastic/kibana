import type api from '@elastic/elasticsearch/lib/api/types';
import type { Required } from 'utility-types';
import type { UnionKeys, Exact, MissingKeysError, PartialWithArrayValues } from './types_helpers';
export type StrictDynamic = false | 'strict';
type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, 'properties'> & {
    dynamic?: StrictDynamic;
};
export type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;
export type StrictMappingTypeMapping = Strict<api.MappingTypeMapping>;
export type AnyMapping = Strict<api.MappingProperty>;
export type KeywordMapping = Strict<api.MappingKeywordProperty>;
export type TextMapping = Strict<api.MappingTextProperty>;
export type DateMapping = Strict<api.MappingDateProperty>;
export type DateNanosMapping = Strict<api.MappingDateNanosProperty>;
export type LongMapping = Strict<api.MappingLongNumberProperty>;
export type IntegerMapping = Strict<api.MappingIntegerNumberProperty>;
export type ShortMapping = Strict<api.MappingShortNumberProperty>;
export type BooleanMapping = Strict<api.MappingBooleanProperty>;
export type FlattenedMapping = Strict<api.MappingFlattenedProperty>;
export type ObjectMapping<T = Record<string, AnyMapping>> = Omit<Strict<api.MappingObjectProperty>, 'dynamic' | 'properties'> & {
    type: 'object';
    dynamic?: StrictDynamic;
    properties: T extends Record<string, AnyMapping> ? T : never;
};
type AllMappingPropertyType = Required<api.MappingProperty>['type'];
type SupportedMappingPropertyType = AllMappingPropertyType & ('text' | 'integer' | 'keyword' | 'boolean' | 'date' | 'short' | 'byte' | 'float' | 'date_nanos' | 'double' | 'long' | 'flattened' | 'object' | 'flattened');
type MappingPropertyObjectType = Required<ObjectMapping, 'type'>;
export type MappingProperty = Extract<api.MappingProperty, {
    type: Exclude<SupportedMappingPropertyType, 'object'>;
}> | MappingPropertyObjectType;
export type ToPrimitives<O extends {
    properties: Record<string, MappingProperty>;
}> = {} extends O ? never : {
    [K in keyof O['properties']]: {} extends O['properties'][K] ? never : O['properties'][K] extends {
        type: infer T;
    } ? T extends 'keyword' ? O['properties'][K] extends {
        enum: infer TEnums;
    } ? TEnums extends Array<infer TEnum> ? TEnum : never : string : T extends 'text' ? string : T extends 'integer' ? number : T extends 'long' ? number : T extends 'short' ? number : T extends 'float' ? number : T extends 'double' ? number : T extends 'byte' ? number : T extends 'boolean' ? boolean : T extends 'date' ? O['properties'][K] extends {
        format: 'strict_date_optional_time';
    } ? string : string | number : T extends 'date_nanos' ? string : T extends 'flattened' ? Record<string, unknown> : T extends 'object' ? O['properties'][K] extends AnyMappingDefinition ? ToPrimitives<O['properties'][K]> : never : never : never;
};
export type AnyMappingDefinition = MappingsDefinition<MappingProperty>;
export type MappingsDefinition<S extends MappingProperty = MappingProperty> = Omit<api.MappingPropertyBase, 'properties'> & {
    properties: Record<string, S>;
};
export type GetFieldsOf<Definition extends MappingsDefinition<MappingProperty>> = PartialWithArrayValues<ToPrimitives<{
    type: 'object';
    properties: Definition['properties'];
}>>;
export type EnsureSubsetOf<SubsetDefinition extends AnyMappingDefinition, AllFields extends GetFieldsOf<SubsetDefinition>> = Exact<GetFieldsOf<SubsetDefinition>, PartialWithArrayValues<AllFields>> extends true ? true : MissingKeysError<Exclude<UnionKeys<GetFieldsOf<SubsetDefinition>> extends string ? UnionKeys<GetFieldsOf<SubsetDefinition>> : never, UnionKeys<AllFields>>>;
export {};
