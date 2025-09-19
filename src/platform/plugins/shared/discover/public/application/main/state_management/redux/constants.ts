/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '@kbn/unified-tabs';
import type { TabState } from './types';

export const DEFAULT_TAB_STATE: Omit<TabState, keyof TabItem> = {
  globalState: {},
  isDataViewLoading: false,
  dataRequestParams: {
    timeRangeAbsolute: undefined,
    timeRangeRelative: undefined,
    searchSessionId: undefined,
  },
  overriddenVisContextAfterInvalidation: undefined,
  controlGroupState: undefined,
  esqlVariables: undefined,
  resetDefaultProfileState: {
    resetId: '',
    columns: false,
    rowHeight: false,
    breakdownField: false,
    hideChart: false,
  },
  uiState: {},
};
