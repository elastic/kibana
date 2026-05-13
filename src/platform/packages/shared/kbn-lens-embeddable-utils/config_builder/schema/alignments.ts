/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const horizontalAlignmentSchema = z.union([
  z.literal('left'),
  z.literal('center'),
  z.literal('right'),
]);

export const verticalAlignmentSchema = z.union([z.literal('top'), z.literal('bottom')]);

export const metricValuePositionSchema = z.union([
  z.literal('top'),
  z.literal('middle'),
  z.literal('bottom'),
]);

export const leftRightAlignmentSchema = z.union([z.literal('left'), z.literal('right')]);

export const positionSchema = z.union([
  z.literal('top'),
  z.literal('bottom'),
  z.literal('left'),
  z.literal('right'),
]);

export const cornerPositionSchema = z.union([
  z.literal('top_left'),
  z.literal('top_right'),
  z.literal('bottom_left'),
  z.literal('bottom_right'),
]);

export const placementSchema = z.union([z.literal('before'), z.literal('after')]);
