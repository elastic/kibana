/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

/**
 * Operation summaries (short, <45 chars, used in OAS summary)
 */
export const CREATE_DATA_VIEW_SUMMARY = 'Create a data view';
export const CREATE_RUNTIME_FIELD_SUMMARY = 'Create a runtime field';
export const CREATE_UPDATE_RUNTIME_FIELD_SUMMARY = 'Create or update a runtime field';
export const DELETE_DATA_VIEW_SUMMARY = 'Delete a data view';
export const DELETE_RUNTIME_FIELD_SUMMARY = 'Delete a runtime field';
export const GET_DATA_VIEW_SUMMARY = 'Get a data view';
export const GET_DATA_VIEWS_SUMMARY = 'Get all data views';
export const GET_DEFAULT_DATA_VIEW_SUMMARY = 'Get the default data view';
export const GET_RUNTIME_FIELD_SUMMARY = 'Get a runtime field';
export const PREVIEW_SWAP_REFERENCES_SUMMARY = 'Preview swap references';
export const SET_DEFAULT_DATA_VIEW_SUMMARY = 'Set the default data view';
export const SWAP_REFERENCES_SUMMARY = 'Swap saved object references';
export const UPDATE_DATA_VIEW_SUMMARY = 'Update a data view';
export const UPDATE_DATA_VIEW_FIELDS_SUMMARY = 'Update field metadata';
export const UPDATE_RUNTIME_FIELD_SUMMARY = 'Update a runtime field';

// Doc URLs match `getDocLinks` in @kbn/doc-links (`indexPatterns.introduction`, `scriptedFields.painless`).
const DATA_VIEW_DOCS_URL =
  'https://www.elastic.co/docs/explore-analyze/find-and-organize/data-views';
const PAINLESS_DOCS_URL =
  'https://www.elastic.co/docs/explore-analyze/scripting/modules-scripting-painless';

/**
 * Operation descriptions (expanded, used in OAS description)
 */
export const DATA_VIEW_DESCRIPTION_PREAMBLE =
  'Data views identify the Elasticsearch data you want to explore and visualize. ' +
  'They can point to one or more data streams, indices, or index aliases, and use optional ' +
  'runtime fields to compute values at query time. Note that data views are not required for ' +
  'ES|QL-based visualizations.';

export const CREATE_DATA_VIEW_DESCRIPTION =
  `Create a data view. ${DATA_VIEW_DESCRIPTION_PREAMBLE} ` +
  `To learn more, refer to the [data views documentation](${DATA_VIEW_DOCS_URL}).`;

export const GET_DATA_VIEWS_DESCRIPTION =
  'Retrieve a list of all data views. Use this endpoint to identify available data views in the current Kibana space.';

export const GET_DATA_VIEW_DESCRIPTION =
  `Retrieve a single data view by its identifier. ${DATA_VIEW_DESCRIPTION_PREAMBLE} ` +
  `To learn more, refer to the [data views documentation](${DATA_VIEW_DOCS_URL}).`;

export const UPDATE_DATA_VIEW_DESCRIPTION =
  'Update an existing data view. Only the fields provided in the request body are updated.';

export const DELETE_DATA_VIEW_DESCRIPTION =
  'Delete a data view by its identifier. WARNING: When you delete a data view, it cannot be recovered.';

export const GET_DEFAULT_DATA_VIEW_DESCRIPTION =
  'Retrieve the identifier of the default data view for the current Kibana space.';

export const SET_DEFAULT_DATA_VIEW_DESCRIPTION =
  'Set the default data view for the current Kibana space. The default data view is used ' +
  'as a fallback when no specific data view is selected.';

export const UPDATE_DATA_VIEW_FIELDS_DESCRIPTION =
  'Update field metadata for a data view. Use this endpoint to set custom labels, ' +
  'custom descriptions, and format overrides for individual fields.';

export const CREATE_RUNTIME_FIELD_DESCRIPTION =
  'Create a runtime field for a data view. Runtime fields are computed at query time ' +
  `using a [Painless script](${PAINLESS_DOCS_URL}) and do not require reindexing. ` +
  'If no `script` is provided, the runtime field returns the corresponding value from the document `_source`.';

export const CREATE_UPDATE_RUNTIME_FIELD_DESCRIPTION =
  'Create or update a runtime field for a data view. If the runtime field already exists, ' +
  'it is replaced with the new definition.';

export const GET_RUNTIME_FIELD_DESCRIPTION =
  'Retrieve a single runtime field by name from a data view.';

export const UPDATE_RUNTIME_FIELD_DESCRIPTION =
  'Update an existing runtime field in a data view. Only the fields provided in the request body are updated.';

export const DELETE_RUNTIME_FIELD_DESCRIPTION = 'Delete a runtime field from a data view.';

export const SWAP_REFERENCES_DESCRIPTION =
  'Swap saved object references from one data view to another. ' +
  'Use this endpoint to update dashboards, visualizations, and other saved objects ' +
  'that reference a data view. ' +
  'WARNING: Misuse can break large numbers of saved objects! ' +
  'Use the [`_preview`](https://www.elastic.co/docs/api/doc/kibana/operation/operation-previewswapdataviewsdefault) endpoint ' +
  'to see which saved objects would be affected before making changes.';

export const PREVIEW_SWAP_REFERENCES_DESCRIPTION =
  'Preview the effect of swapping saved object references from one data view to another. ' +
  'Returns the list of affected saved objects without making any changes.';
