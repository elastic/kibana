/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { drilldownsComparators } from '@kbn/embeddable-plugin/common';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { timeRangeComparators, titleComparators } from '@kbn/presentation-publishing';
import type { VegaByValueState } from '../server';

export const vegaStateComparison: SerializedStateComparison<VegaByValueState> = {
  comparators: {
    ...titleComparators,
    ...timeRangeComparators,
    ...drilldownsComparators,
    query: 'deepEquality',
    filters: 'deepEquality',
    spec: 'deepEquality',
  },
};
