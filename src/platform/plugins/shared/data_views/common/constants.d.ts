/**
 * All runtime field types.
 * @public
 */
export declare const RUNTIME_FIELD_COMPOSITE_TYPE: "composite";
export type RuntimeFieldCompositeType = typeof RUNTIME_FIELD_COMPOSITE_TYPE;
export declare const PRIMITIVE_RUNTIME_FIELD_TYPES: readonly ["keyword", "long", "double", "date", "ip", "boolean", "geo_point"];
export type PrimitiveRuntimeFieldTypes = typeof PRIMITIVE_RUNTIME_FIELD_TYPES;
export declare const RUNTIME_FIELD_TYPES: readonly ["keyword", "long", "double", "date", "ip", "boolean", "geo_point", "composite"];
/**
 * Used to optimize on-boarding experience to determine if the instance has some user created data views or data indices/streams by filtering data sources
 * that are created by default by elastic in ese.
 * We should somehow prevent creating initial data for the users without their explicit action
 * instead of relying on these hardcoded assets
 */
export declare const DEFAULT_ASSETS_TO_IGNORE: {
    DATA_STREAMS_TO_IGNORE: string[];
};
/**
 * UiSettings key for metaFields list.
 * @public
 */
export declare const META_FIELDS = "metaFields";
/**
 * Data view saved object type.
 * @public
 */
export declare const DATA_VIEW_SAVED_OBJECT_TYPE = "index-pattern";
/**
 * Data views plugin name.
 * @public
 */
export declare const PLUGIN_NAME = "DataViews";
/**
 * Max length for the custom field description
 */
export declare const MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH = 300;
/**
 * Fields for wildcard path.
 * @public
 */
export declare const FIELDS_FOR_WILDCARD_PATH = "/internal/data_views/_fields_for_wildcard";
/**
 * Fields path. Like fields for wildcard but GET only
 * @public
 */
export declare const FIELDS_PATH = "/internal/data_views/fields";
/**
 * Existing indices path
 * @public
 */
export declare const EXISTING_INDICES_PATH = "/internal/data_views/_existing_indices";
export declare const DATA_VIEWS_FIELDS_EXCLUDED_TIERS = "data_views:fields_excluded_data_tiers";
export declare const DEFAULT_DATA_VIEW_ID = "defaultIndex";
/**
 * Valid `failureReason` attribute values for `has_es_data` API error responses
 */
export declare enum HasEsDataFailureReason {
    localDataTimeout = "local_data_timeout",
    remoteDataTimeout = "remote_data_timeout",
    unknown = "unknown"
}
