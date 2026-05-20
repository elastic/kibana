import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Serializable, SerializableArray } from '@kbn/utility-types/src/serializable';
import type { DefaultActionsSupportedValue, NonNullableSerializable } from './types';
export declare const SUPPORTED_KBN_TYPES: KBN_FIELD_TYPES[];
export declare const isTypeSupportedByDefaultActions: (kbnFieldType: KBN_FIELD_TYPES) => boolean;
export declare const isValueSupportedByDefaultActions: (value: NonNullableSerializable[]) => value is DefaultActionsSupportedValue;
export declare const filterOutNullableValues: (value: SerializableArray) => NonNullableSerializable[];
export declare const valueToArray: (value: Serializable) => SerializableArray;
