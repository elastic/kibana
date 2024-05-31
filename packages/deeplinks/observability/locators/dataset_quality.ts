/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';

export const DATASET_QUALITY_LOCATOR_ID = 'DATASET_QUALITY_LOCATOR';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type RefreshInterval = {
  pause: boolean;
  value: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TimeRangeConfig = {
  from: string;
  to: string;
  refresh: RefreshInterval;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Filters = {
  timeRange: TimeRangeConfig;
};

export interface DatasetQualityLocatorParams extends SerializableRecord {
  filters?: Filters;
}
