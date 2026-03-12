/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchEmbeddableState } from '../../common/embeddable/types';

export { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';

//
// Do not change constant value - part of public REST APIs
//
export const LEGACY_LOG_STREAM_EMBEDDABLE = 'log_stream';

export const ACTION_VIEW_SAVED_SEARCH = 'ACTION_VIEW_SAVED_SEARCH';

export const DEFAULT_HEADER_ROW_HEIGHT_LINES = 3;

/** This constant refers to the dashboard panel specific state */
export const EDITABLE_PANEL_KEYS: Readonly<Array<keyof SearchEmbeddableState>> = [
  'title', // panel title
  'description', // panel description
  'time_range', // panel custom time range
  'hide_title', // panel hidden title
  'drilldowns', // panel drilldowns
] as const;
