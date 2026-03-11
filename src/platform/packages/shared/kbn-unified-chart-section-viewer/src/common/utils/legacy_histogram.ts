/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { MetricField } from '../../types';
import { getPrimaryValue } from './get_primary_value';

/**
 * A legacy histogram is a metric where both the ES field type and the
 * metric instrument are histogram.
 */
export const isLegacyHistogram = (field: MetricField): boolean => {
  const fieldType = getPrimaryValue(field.fieldtypes);
  const metricType = getPrimaryValue(field.metricTypes);
  return fieldType === 'histogram' && metricType === 'histogram';
};
