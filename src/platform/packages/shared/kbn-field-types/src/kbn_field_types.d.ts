import type { KbnFieldType } from './kbn_field_type';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';
/**
 *  Get a type object by name
 *
 *  @param  {string} typeName
 *  @return {KbnFieldType}
 */
export declare const getKbnFieldType: (typeName: string) => KbnFieldType;
/**
 *  Get the esTypes known by all kbnFieldTypes
 *
 *  @return {Array<string>}
 */
export declare const getKbnTypeNames: () => string[];
/**
 *  Get the KbnFieldType name for an esType string
 *
 *  @param {string} esType
 *  @return {string}
 */
export declare const castEsToKbnFieldTypeName: (esType: ES_FIELD_TYPES | string) => KBN_FIELD_TYPES;
/**
 *  Get filterable KbnFieldTypes
 *
 *  @return {Array<string>}
 */
export declare const getFilterableKbnTypeNames: () => string[];
export declare function esFieldTypeToKibanaFieldType(type: string): KBN_FIELD_TYPES;
