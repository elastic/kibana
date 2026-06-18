/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const orientationSchema = z
  .union([z.literal('horizontal'), z.literal('vertical'), z.literal('angled')])
  .meta({
    id: 'vis_api_orientation',
    description: 'Orientation',
  });

export const simpleOrientationSchema = z
  .union([z.literal('horizontal'), z.literal('vertical')])
  .meta({
    id: 'vis_api_simple_orientation',
    description: 'Orientation',
  });

export const directionSchema = z.union([z.literal('asc'), z.literal('desc')]).meta({
  id: 'vis_api_direction',
  description: 'Direction',
});
