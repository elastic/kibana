/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { SearchEmbeddableSerializedState } from './types';

export { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';

export const SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID =
  'SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID';

export const SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER: Trigger = {
  id: SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
  title: 'Discover session embeddable cell actions',
  description:
    'This trigger is used to replace the cell actions for Discover session embeddable grid.',
} as const;

export const LEGACY_LOG_STREAM_EMBEDDABLE = 'LOG_STREAM_EMBEDDABLE';

export const ACTION_VIEW_SAVED_SEARCH = 'ACTION_VIEW_SAVED_SEARCH';

export const DEFAULT_HEADER_ROW_HEIGHT_LINES = 3;

/** This constant refers to the parts of the saved search state that can be edited from a dashboard */
export const EDITABLE_SAVED_SEARCH_KEYS: Readonly<Array<keyof SavedSearchAttributes>> = [
  'sort',
  'columns',
  'rowHeight',
  'sampleSize',
  'rowsPerPage',
  'headerRowHeight',
  'density',
  'grid',
] as const;

/** This constant refers to the dashboard panel specific state */
export const EDITABLE_PANEL_KEYS: Readonly<Array<keyof SearchEmbeddableSerializedState>> = [
  'title', // panel title
  'description', // panel description
  'timeRange', // panel custom time range
  'hidePanelTitles', // panel hidden title
  'enhancements', // panel enhancements (e.g. drilldowns)
] as const;
