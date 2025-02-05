/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { ROW_HEIGHT_OPTION, SAMPLE_SIZE_SETTING } from '@kbn/discover-utils';
import { getDefaultRowsPerPage } from '../../common/constants';
import { DEFAULT_HEADER_ROW_HEIGHT_LINES } from './constants';

export interface SearchEmbeddableDefaults {
  rowHeight: number | undefined;
  headerRowHeight: number | undefined;
  rowsPerPage: number | undefined;
  sampleSize: number | undefined;
}

export const getSearchEmbeddableDefaults = (
  uiSettings: IUiSettingsClient
): SearchEmbeddableDefaults => {
  return {
    rowHeight: uiSettings.get(ROW_HEIGHT_OPTION),
    headerRowHeight: DEFAULT_HEADER_ROW_HEIGHT_LINES,
    rowsPerPage: getDefaultRowsPerPage(uiSettings),
    sampleSize: uiSettings.get(SAMPLE_SIZE_SETTING),
  };
};
