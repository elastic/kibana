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
