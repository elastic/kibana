/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { SAMPLE_SIZE_SETTING } from '@kbn/discover-utils';
import {
  MIN_SAVED_SEARCH_SAMPLE_SIZE,
  MAX_SAVED_SEARCH_SAMPLE_SIZE,
} from '@kbn/saved-search-plugin/common';

export const getMaxAllowedSampleSize = (uiSettings: IUiSettingsClient): number => {
  return Math.min(uiSettings.get(SAMPLE_SIZE_SETTING) || 500, MAX_SAVED_SEARCH_SAMPLE_SIZE);
};

export const getAllowedSampleSize = (
  customSampleSize: number | undefined,
  uiSettings: IUiSettingsClient
): number => {
  if (!customSampleSize || customSampleSize < 0) {
    return uiSettings.get(SAMPLE_SIZE_SETTING);
  }
  return Math.max(
    Math.min(customSampleSize, getMaxAllowedSampleSize(uiSettings)),
    MIN_SAVED_SEARCH_SAMPLE_SIZE
  );
};
