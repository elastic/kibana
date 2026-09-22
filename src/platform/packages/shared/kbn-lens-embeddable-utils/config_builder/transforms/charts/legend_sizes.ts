/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LegendSize } from '@kbn/chart-expressions-common';

import { getReversibleMappings } from './utils';

type APILegendSize = 'auto' | 's' | 'm' | 'l' | 'xl';

export const legendSizeCompat = getReversibleMappings<APILegendSize, LegendSize>([
  ['auto', LegendSize.AUTO],
  ['s', LegendSize.SMALL],
  ['m', LegendSize.MEDIUM],
  ['l', LegendSize.LARGE],
  ['xl', LegendSize.EXTRA_LARGE],
]);
