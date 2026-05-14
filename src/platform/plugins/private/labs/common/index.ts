/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  LABS_STORAGE_KEY,
  LABS_USER_SETTINGS_DATA_PATH,
  LABS_USER_SETTINGS_INSTALLED_FIELD,
  PLUGIN_ICON,
  PLUGIN_ID,
  PLUGIN_PATH,
} from './constants';
export { LAB_IDS, type LabId, type LabsProfileData } from './types';
export {
  EMBEDDING_EXPLORER_APP_ID,
  EMBEDDING_EXPLORER_DEFAULT_INDEX_SAMPLE_SIZE,
  EMBEDDING_EXPLORER_INDEX_DATA_API_PATH,
  EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH,
  EMBEDDING_EXPLORER_INDICES_API_PATH,
  EMBEDDING_EXPLORER_LAB_ID,
  EMBEDDING_EXPLORER_SAMPLE_INDICES_API_PATH,
  type EmbeddingExplorerDatasetResponse,
  type EmbeddingExplorerIndexDataRequest,
  type EmbeddingExplorerIndexDataResponse,
  type EmbeddingExplorerIndexFieldsResponse,
  type EmbeddingExplorerIndicesResponse,
  type EmbeddingExplorerSampleIndicesResponse,
  type EmbeddingExplorerMetadataValue,
  type EmbeddingExplorerPoint,
} from './lab_apps/embedding_explorer';
export {
  HELLO_WORLD_API_PATH,
  HELLO_WORLD_APP_ID,
  HELLO_WORLD_LAB_ID,
  type HelloWorldResponse,
} from './lab_apps/hello_world';
