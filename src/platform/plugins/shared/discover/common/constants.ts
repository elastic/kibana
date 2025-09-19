/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SAMPLE_ROWS_PER_PAGE_SETTING } from '@kbn/discover-utils';
import type { IUiSettingsClient } from '@kbn/core/public';

export const DEFAULT_ROWS_PER_PAGE = 100;
export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, DEFAULT_ROWS_PER_PAGE, 250, 500];

export enum VIEW_MODE {
  DOCUMENT_LEVEL = 'documents',
  AGGREGATED_LEVEL = 'aggregated',
  PATTERN_LEVEL = 'patterns',
}

export const getDefaultRowsPerPage = (uiSettings: IUiSettingsClient): number => {
  return parseInt(uiSettings.get(SAMPLE_ROWS_PER_PAGE_SETTING), 10) || DEFAULT_ROWS_PER_PAGE;
};

// local storage key for the ES|QL to Dataviews transition modal
export const ESQL_TRANSITION_MODAL_KEY = 'data.textLangTransitionModal';

/**
 * The id value used to indicate that a link should open in a new Discover tab.
 * It will be used in the `_tab` URL param to indicate that a new tab should be created.
 * Once created, the new tab will have a unique id.
 */
export const NEW_TAB_ID = 'new' as const;

/**
 * The query param key used to store the Discover app state in the URL
 */
export const APP_STATE_URL_KEY = '_a';
export const GLOBAL_STATE_URL_KEY = '_g';
export const TAB_STATE_URL_KEY = '_tab'; // `_t` is already used by Kibana for time, so we use `_tab` here

/**
 * Product feature IDs
 */
export const TRACES_PRODUCT_FEATURE_ID = 'discover:traces';
export const METRICS_EXPERIENCE_PRODUCT_FEATURE_ID = 'discover:metrics-experience';
