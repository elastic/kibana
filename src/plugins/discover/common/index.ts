/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'discover';
export const APP_ICON = 'discoverApp';

export {
  DEFAULT_COLUMNS_SETTING,
  SAMPLE_SIZE_SETTING,
  SAMPLE_ROWS_PER_PAGE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
  SEARCH_ON_PAGE_LOAD_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  FIELDS_LIMIT_SETTING,
  CONTEXT_DEFAULT_SIZE_SETTING,
  CONTEXT_STEP_SETTING,
  CONTEXT_TIE_BREAKER_FIELDS_SETTING,
  DOC_TABLE_LEGACY,
  MODIFY_COLUMNS_ON_SWITCH,
  SEARCH_FIELDS_FROM_SOURCE,
  MAX_DOC_FIELDS_DISPLAYED,
  SHOW_FIELD_STATISTICS,
  SHOW_MULTIFIELDS,
  TRUNCATE_MAX_HEIGHT,
  ROW_HEIGHT_OPTION,
  SEARCH_EMBEDDABLE_TYPE,
  HIDE_ANNOUNCEMENTS,
  ENABLE_SQL,
} from '@kbn/unified-discover';

export type {
  DiscoverAppLocator,
  DiscoverAppLocatorParams,
} from '@kbn/unified-discover/src/main/types';
