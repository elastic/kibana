/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export type FieldTypeKnown = Exclude<
  DataViewField['timeSeriesMetric'] | DataViewField['type'],
  undefined
>;

export interface FieldBase {
  name: DataViewField['name'];
  type?: DataViewField['type'];
  displayName?: DataViewField['displayName'];
  customDescription?: DataViewField['customDescription'];
  count?: DataViewField['count'];
  timeSeriesMetric?: DataViewField['timeSeriesMetric'];
  esTypes?: DataViewField['esTypes'];
  scripted?: DataViewField['scripted'];
  isNull?: DataViewField['isNull'];
  conflictDescriptions?: Record<string, string[]>;
}

export type GetCustomFieldType<T extends FieldBase> = (field: T) => FieldTypeKnown;
