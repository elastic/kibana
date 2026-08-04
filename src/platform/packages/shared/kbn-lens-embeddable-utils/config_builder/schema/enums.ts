/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';

export const orientationSchema = lazySchema(() =>
  z.enum(['horizontal', 'vertical', 'angled']).meta({
    id: 'vis_api_orientation',
    description: 'Orientation',
  })
);

export const simpleOrientationSchema = lazySchema(() =>
  z.enum(['horizontal', 'vertical']).meta({
    id: 'vis_api_simple_orientation',
    description: 'Orientation',
  })
);

export const directionSchema = lazySchema(() =>
  z.enum(['asc', 'desc']).meta({
    id: 'vis_api_direction',
    description: 'Direction',
  })
);
