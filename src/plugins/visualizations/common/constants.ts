/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES, BUCKET_TYPES } from '@kbn/data-plugin/common';

export const VISUALIZE_ENABLE_LABS_SETTING = 'visualize:enableLabs';
export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';
export const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';

export const STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const VISUALIZE_APP_NAME = 'visualize';

export const VisualizeConstants = {
  VISUALIZE_BASE_PATH: '/app/visualize',
  LANDING_PAGE_PATH: '/',
  WIZARD_STEP_1_PAGE_PATH: '/new',
  WIZARD_STEP_2_PAGE_PATH: '/new/configure',
  CREATE_PATH: '/create',
  EDIT_PATH: '/edit',
  EDIT_BY_VALUE_PATH: '/edit_by_value',
  APP_ID: 'visualize',
};

export enum LegendSize {
  AUTO = 'auto',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'xlarge',
}

export const LegendSizeToPixels = {
  [LegendSize.AUTO]: undefined,
  [LegendSize.SMALL]: 80,
  [LegendSize.MEDIUM]: 130,
  [LegendSize.LARGE]: 180,
  [LegendSize.EXTRA_LARGE]: 230,
} as const;

export const DEFAULT_LEGEND_SIZE = LegendSize.MEDIUM;

export const SUPPORTED_AGGREGATIONS = [
  ...Object.values(METRIC_TYPES),
  ...Object.values(BUCKET_TYPES),
] as const;
