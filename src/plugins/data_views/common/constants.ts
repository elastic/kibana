/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * All runtime field types.
 * @public
 */
export const RUNTIME_FIELD_TYPES = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
  'geo_shape',
  'composite',
] as const;

/**
 * Used to optimize on-boarding experience to determine if the instance has some user created data views or data indices/streams by filtering data sources
 * that are created by default by elastic in ese.
 * We should somehow prevent creating initial data for the users without their explicit action
 * instead of relying on these hardcoded assets
 */
export const DEFAULT_ASSETS_TO_IGNORE = {
  DATA_STREAMS_TO_IGNORE: [
    'logs-enterprise_search.api-default', // https://github.com/elastic/kibana/issues/134918
    `logs-enterprise_search.audit-default`, // https://github.com/elastic/kibana/issues/134918
  ],
};

/**
 * UiSettings key for metaFields list.
 * @public
 */
export const META_FIELDS = 'metaFields';

/**
 * Data view saved object type.
 * @public
 */
export const DATA_VIEW_SAVED_OBJECT_TYPE = 'index-pattern';

/**
 * Data views plugin name.
 * @public
 */
export const PLUGIN_NAME = 'DataViews';

/**
 * Max length for the custom field description
 */
export const MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH = 300;

/**
 * Fields for wildcard path.
 * @public
 */
export const FIELDS_FOR_WILDCARD_PATH = '/internal/data_views/_fields_for_wildcard';

/**
 * Fields path. Like fields for wildcard but GET only
 * @public
 */
export const FIELDS_PATH = '/internal/data_views/fields';

/**
 * Existing indices path
 * @public
 */
export const EXISTING_INDICES_PATH = '/internal/data_views/_existing_indices';

export const DATA_VIEWS_FIELDS_EXCLUDED_TIERS = 'data_views:fields_excluded_data_tiers';

export const DEFAULT_DATA_VIEW_ID = 'defaultIndex';
