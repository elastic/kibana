/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { Dimension } from '../../../common/dimensions/types';
import type { MetricField } from '../../../common/fields/types';

export function buildMetricField({
  name,
  index,
  dimensions,
  type,
  typeInfo,
}: {
  name: string;
  index: string;
  dimensions: Array<Dimension>;
  type: string;
  typeInfo: FieldCapsFieldCapability;
}): MetricField {
  const unit = Array.isArray(typeInfo.meta?.unit)
    ? typeInfo.meta.unit.join(', ')
    : typeInfo.meta?.unit;

  const description = Array.isArray(typeInfo.meta?.description)
    ? typeInfo.meta.description.join(', ')
    : typeInfo.meta?.description;

  const display = Array.isArray(typeInfo.meta?.display)
    ? typeInfo.meta.display.join(', ')
    : typeInfo.meta?.display;

  return {
    name,
    index,
    dimensions,
    type,
    time_series_metric: typeInfo.time_series_metric,
    unit,
    description,
    display,
  };
}
