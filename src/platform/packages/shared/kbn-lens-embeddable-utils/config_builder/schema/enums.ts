/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const orientationSchema = z.enum(['horizontal', 'vertical', 'angled']).meta({
  id: 'visApiOrientation',
  description: 'Orientation',
});

export const simpleOrientationSchema = z.enum(['horizontal', 'vertical']).meta({
  id: 'visApiSimpleOrientation',
  description: 'Orientation',
});

export const directionSchema = z.enum(['asc', 'desc']).meta({
  id: 'visApiDirection',
  description: 'Direction',
});
