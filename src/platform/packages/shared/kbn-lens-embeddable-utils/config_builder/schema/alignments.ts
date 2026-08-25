/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';

export const horizontalAlignmentSchema = lazySchema(() => z.enum(['left', 'center', 'right']));

export const verticalAlignmentSchema = lazySchema(() => z.enum(['top', 'bottom']));

export const metricValuePositionSchema = lazySchema(() => z.enum(['top', 'middle', 'bottom']));

export const leftRightAlignmentSchema = lazySchema(() => z.enum(['left', 'right']));

export const positionSchema = lazySchema(() => z.enum(['top', 'bottom', 'left', 'right']));

export const cornerPositionSchema = lazySchema(() =>
  z.enum(['top_left', 'top_right', 'bottom_left', 'bottom_right'])
);

export const placementSchema = lazySchema(() => z.enum(['before', 'after']));
