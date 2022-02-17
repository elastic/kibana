/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const SERVICE_PATH = '/api/data_views';
export const SERVICE_PATH_LEGACY = '/api/index_patterns';
export const DATA_VIEW_PATH = `${SERVICE_PATH}/data_view`;
export const DATA_VIEW_PATH_LEGACY = `${SERVICE_PATH_LEGACY}/index_pattern`;
export const SPECIFIC_DATA_VIEW_PATH = `${DATA_VIEW_PATH}/{id}`;
export const SPECIFIC_DATA_VIEW_PATH_LEGACY = `${DATA_VIEW_PATH_LEGACY}/{id}`;
export const RUNTIME_FIELD_PATH = `${SPECIFIC_DATA_VIEW_PATH}/runtime_field`;
export const RUNTIME_FIELD_PATH_LEGACY = `${SPECIFIC_DATA_VIEW_PATH_LEGACY}/runtime_field`;
export const SPECIFIC_RUNTIME_FIELD_PATH = `${RUNTIME_FIELD_PATH}/{name}`;
export const SPECIFIC_RUNTIME_FIELD_PATH_LEGACY = `${RUNTIME_FIELD_PATH_LEGACY}/{name}`;

export const SCRIPTED_FIELD_PATH = `${SPECIFIC_DATA_VIEW_PATH}/scripted_field`;
export const SCRIPTED_FIELD_PATH_LEGACY = `${SPECIFIC_DATA_VIEW_PATH_LEGACY}/scripted_field`;
export const SPECIFIC_SCRIPTED_FIELD_PATH = `${SCRIPTED_FIELD_PATH}/{name}`;
export const SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY = `${SCRIPTED_FIELD_PATH_LEGACY}/{name}`;

export const SERVICE_KEY = 'data_view';
export const SERVICE_KEY_LEGACY = 'index_pattern';
export type SERVICE_KEY_TYPE = typeof SERVICE_KEY | typeof SERVICE_KEY_LEGACY;

export const CREATE_DATA_VIEW_COUNTER_NAME = `POST ${DATA_VIEW_PATH}`;
