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
  'composite',
] as const;

/**
 * Used to determine if the instance has any user created index patterns by filtering index patterns
 * that are created and backed only by Fleet server data
 * Should be revised after https://github.com/elastic/kibana/issues/82851 is fixed
 * For more background see: https://github.com/elastic/kibana/issues/107020
 */
export const DEFAULT_ASSETS_TO_IGNORE = {
  LOGS_INDEX_PATTERN: 'logs-*',
  LOGS_DATA_STREAM_TO_IGNORE: 'logs-elastic_agent', // ignore ds created by Fleet server itself
  ENT_SEARCH_LOGS_DATA_STREAM_TO_IGNORE: 'logs-enterprise_search.api-default', // ignore ds created by enterprise search
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
