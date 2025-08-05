/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StaticValueIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiStaticValueOperation } from '../schema/metric_ops';

export const getStaticValueColumn = (
  options: LensApiStaticValueOperation
): StaticValueIndexPatternColumn => {
  return {
    dataType: 'number',
    isBucketed: false,
    ...(options.label ? { label: options.label!, customLabel: true } : { label: 'Static Value' }),
    operationType: 'static_value',
    params: {
      value: options.value.toString(),
    },
    references: [],
  };
};

export const getStaticValueColumnReverse = (
  options: StaticValueIndexPatternColumn
): LensApiStaticValueOperation => {
  return {
    operation: 'static_value',
    label: options.label,
    value: Number(options.params.value),
  };
};
