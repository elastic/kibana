/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricUnit } from '../../../common/fields/types';

const RATIO_FIELD_NAME_SUFFIX = 'utilization';
const normalizedUnitMap: Record<string, MetricUnit> = {
  // otel
  by: 'bytes',
  '%': 'percent',
  '1': 'count',
  // ecs
  byte: 'bytes',
  nanos: 'ns',
  micros: 'us',
};
export function normalizeUnit({
  fieldName,
  unit,
}: {
  fieldName: string;
  unit: string | undefined;
}): MetricUnit | undefined {
  const isRatio = isRatioField(fieldName);
  if (!unit?.trim() && !isRatio) {
    return;
  }

  const normalizedUnit = unit ? normalizedUnitMap[unit.toLowerCase()] ?? unit : undefined;

  if (isRatio && (!normalizedUnit || normalizedUnit === 'count')) {
    return 'percent';
  }

  return normalizedUnit;
}

function isRatioField(fieldName: string): boolean {
  return fieldName.toLowerCase().includes(RATIO_FIELD_NAME_SUFFIX);
}
