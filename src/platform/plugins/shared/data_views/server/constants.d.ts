/**
 * Service path for data views REST API
 */
export declare const SERVICE_PATH = "/api/data_views";
/**
 * Legacy service path for data views REST API
 */
export declare const SERVICE_PATH_LEGACY = "/api/index_patterns";
/**
 * Path for data view creation
 */
export declare const DATA_VIEW_PATH = "/api/data_views/data_view";
/**
 * Legacy path for data view creation
 */
export declare const DATA_VIEW_PATH_LEGACY = "/api/index_patterns/index_pattern";
/**
 * Path for single data view
 */
export declare const SPECIFIC_DATA_VIEW_PATH = "/api/data_views/data_view/{id}";
/**
 * Legacy path for single data view
 */
export declare const SPECIFIC_DATA_VIEW_PATH_LEGACY = "/api/index_patterns/index_pattern/{id}";
/**
 * Path to create runtime field
 */
export declare const RUNTIME_FIELD_PATH = "/api/data_views/data_view/{id}/runtime_field";
/**
 * Legacy path to create runtime field
 */
export declare const RUNTIME_FIELD_PATH_LEGACY = "/api/index_patterns/index_pattern/{id}/runtime_field";
/**
 * Path for runtime field
 */
export declare const SPECIFIC_RUNTIME_FIELD_PATH = "/api/data_views/data_view/{id}/runtime_field/{name}";
/**
 * Legacy path for runtime field
 */
export declare const SPECIFIC_RUNTIME_FIELD_PATH_LEGACY = "/api/index_patterns/index_pattern/{id}/runtime_field/{name}";
/**
 * Path to create scripted field
 */
export declare const SCRIPTED_FIELD_PATH = "/api/data_views/data_view/{id}/scripted_field";
/**
 * Legacy path to create scripted field
 */
export declare const SCRIPTED_FIELD_PATH_LEGACY = "/api/index_patterns/index_pattern/{id}/scripted_field";
/**
 * Path for scripted field
 */
export declare const SPECIFIC_SCRIPTED_FIELD_PATH = "/api/data_views/data_view/{id}/scripted_field/{name}";
/**
 * Legacy path for scripted field
 */
export declare const SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY = "/api/index_patterns/index_pattern/{id}/scripted_field/{name}";
/**
 * Path to swap references
 */
export declare const DATA_VIEW_SWAP_REFERENCES_PATH = "/api/data_views/swap_references";
/**
 * name of service in path form
 */
export declare const SERVICE_KEY = "data_view";
/**
 * Legacy name of service in path form
 */
export declare const SERVICE_KEY_LEGACY = "index_pattern";
/**
 * Service keys as type
 */
export type SERVICE_KEY_TYPE = typeof SERVICE_KEY | typeof SERVICE_KEY_LEGACY;
/**
 * Initial REST version date
 */
export declare const INITIAL_REST_VERSION = "2023-10-31";
/**
 * Initial REST version internal
 */
export declare const INITIAL_REST_VERSION_INTERNAL = "1";
/**
 * Default field caps cache max-age in seconds
 */
export declare const DEFAULT_FIELD_CACHE_FRESHNESS = 5;
/**
 * Operation summaries (short, <45 chars, used in OAS summary)
 */
export declare const CREATE_DATA_VIEW_SUMMARY = "Create a data view";
export declare const CREATE_RUNTIME_FIELD_SUMMARY = "Create a runtime field";
export declare const CREATE_UPDATE_RUNTIME_FIELD_SUMMARY = "Create or update a runtime field";
export declare const DELETE_DATA_VIEW_SUMMARY = "Delete a data view";
export declare const DELETE_RUNTIME_FIELD_SUMMARY = "Delete a runtime field";
export declare const GET_DATA_VIEW_SUMMARY = "Get a data view";
export declare const GET_DATA_VIEWS_SUMMARY = "Get all data views";
export declare const GET_DEFAULT_DATA_VIEW_SUMMARY = "Get the default data view";
export declare const GET_RUNTIME_FIELD_SUMMARY = "Get a runtime field";
export declare const PREVIEW_SWAP_REFERENCES_SUMMARY = "Preview swap references";
export declare const SET_DEFAULT_DATA_VIEW_SUMMARY = "Set the default data view";
export declare const SWAP_REFERENCES_SUMMARY = "Swap saved object references";
export declare const UPDATE_DATA_VIEW_SUMMARY = "Update a data view";
export declare const UPDATE_DATA_VIEW_FIELDS_SUMMARY = "Update field metadata";
export declare const UPDATE_RUNTIME_FIELD_SUMMARY = "Update a runtime field";
/**
 * Operation descriptions (expanded, used in OAS description)
 */
export declare const DATA_VIEW_DESCRIPTION_PREAMBLE: string;
export declare const CREATE_DATA_VIEW_DESCRIPTION: string;
export declare const GET_DATA_VIEWS_DESCRIPTION = "Retrieve a list of all data views. Use this endpoint to identify available data views in the current Kibana space.";
export declare const GET_DATA_VIEW_DESCRIPTION: string;
export declare const UPDATE_DATA_VIEW_DESCRIPTION = "Update an existing data view. Only the fields provided in the request body are updated.";
export declare const DELETE_DATA_VIEW_DESCRIPTION = "Delete a data view by its identifier. WARNING: When you delete a data view, it cannot be recovered.";
export declare const GET_DEFAULT_DATA_VIEW_DESCRIPTION = "Retrieve the identifier of the default data view for the current Kibana space.";
export declare const SET_DEFAULT_DATA_VIEW_DESCRIPTION: string;
export declare const UPDATE_DATA_VIEW_FIELDS_DESCRIPTION: string;
export declare const CREATE_RUNTIME_FIELD_DESCRIPTION: string;
export declare const CREATE_UPDATE_RUNTIME_FIELD_DESCRIPTION: string;
export declare const GET_RUNTIME_FIELD_DESCRIPTION = "Retrieve a single runtime field by name from a data view.";
export declare const UPDATE_RUNTIME_FIELD_DESCRIPTION = "Update an existing runtime field in a data view. Only the fields provided in the request body are updated.";
export declare const DELETE_RUNTIME_FIELD_DESCRIPTION = "Delete a runtime field from a data view.";
export declare const SWAP_REFERENCES_DESCRIPTION: string;
export declare const PREVIEW_SWAP_REFERENCES_DESCRIPTION: string;
