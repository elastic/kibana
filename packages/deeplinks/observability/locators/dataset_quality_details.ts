/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';

export const DATA_QUALITY_DETAILS_LOCATOR_ID = 'DATA_QUALITY_DETAILS_LOCATOR';

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
type DegradedFieldsTable = {
  page?: number;
  rowsPerPage?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
};

export interface DataQualityDetailsLocatorParams extends SerializableRecord {
  dataStream: string;
  timeRange?: TimeRangeConfig;
  breakdownField?: string;
  degradedFields?: {
    table?: DegradedFieldsTable;
  };
  expandedDegradedField?: string;
  showCurrentQualityIssues?: boolean;
}
