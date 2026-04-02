/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getReversibleMappings } from './utils';

/** API axis label orientation string ↔ numeric rotation in Lens XY / heatmap state */
export const axisLabelOrientationCompat = getReversibleMappings<
  'horizontal' | 'vertical' | 'angled',
  0 | -90 | -45
>([
  ['horizontal', 0],
  ['vertical', -90],
  ['angled', -45],
]);
