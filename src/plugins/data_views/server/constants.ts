/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Service path for data views REST API
 */
export const SERVICE_PATH = '/api/data_views';
/**
 * Legacy service path for data views REST API
 */
export const SERVICE_PATH_LEGACY = '/api/index_patterns';
/**
 * Path for data view creation
 */
export const DATA_VIEW_PATH = `${SERVICE_PATH}/data_view`;
/**
 * Legacy path for data view creation
 */
export const DATA_VIEW_PATH_LEGACY = `${SERVICE_PATH_LEGACY}/index_pattern`;
/**
 * Path for single data view
 */
export const SPECIFIC_DATA_VIEW_PATH = `${DATA_VIEW_PATH}/{id}`;
/**
 * Legacy path for single data view
 */
export const SPECIFIC_DATA_VIEW_PATH_LEGACY = `${DATA_VIEW_PATH_LEGACY}/{id}`;
/**
 * Path to create runtime field
 */
export const RUNTIME_FIELD_PATH = `${SPECIFIC_DATA_VIEW_PATH}/runtime_field`;
/**
 * Legacy path to create runtime field
 */
export const RUNTIME_FIELD_PATH_LEGACY = `${SPECIFIC_DATA_VIEW_PATH_LEGACY}/runtime_field`;
/**
 * Path for runtime field
 */
export const SPECIFIC_RUNTIME_FIELD_PATH = `${RUNTIME_FIELD_PATH}/{name}`;
/**
 * Legacy path for runtime field
 */
export const SPECIFIC_RUNTIME_FIELD_PATH_LEGACY = `${RUNTIME_FIELD_PATH_LEGACY}/{name}`;

/**
 * Path to create scripted field
 */
export const SCRIPTED_FIELD_PATH = `${SPECIFIC_DATA_VIEW_PATH}/scripted_field`;
/**
 * Legacy path to create scripted field
 */
export const SCRIPTED_FIELD_PATH_LEGACY = `${SPECIFIC_DATA_VIEW_PATH_LEGACY}/scripted_field`;
/**
 * Path for scripted field
 */
export const SPECIFIC_SCRIPTED_FIELD_PATH = `${SCRIPTED_FIELD_PATH}/{name}`;
/**
 * Legacy path for scripted field
 */
export const SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY = `${SCRIPTED_FIELD_PATH_LEGACY}/{name}`;

/**
 * Path to swap references
 */
export const DATA_VIEW_SWAP_REFERENCES_PATH = `${SERVICE_PATH}/swap_references`;

/**
 * name of service in path form
 */
export const SERVICE_KEY = 'data_view';
/**
 * Legacy name of service in path form
 */
export const SERVICE_KEY_LEGACY = 'index_pattern';
/**
 * Service keys as type
 */
export type SERVICE_KEY_TYPE = typeof SERVICE_KEY | typeof SERVICE_KEY_LEGACY;

/**
 * Initial REST version date
 */

export const INITIAL_REST_VERSION = '2023-10-31';

/**
 * Initial REST version internal
 */

export const INITIAL_REST_VERSION_INTERNAL = '1';

/**
 * Default field caps cache max-age in seconds
 */
export const DEFAULT_FIELD_CACHE_FRESHNESS = 5;
