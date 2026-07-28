/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const geoPointFormatSchema = z.object({
  type: z.literal('geo_point'),
  params: z
    .object({
      transform: z.union([
        z.literal('lat_lon_string'),
        z.literal('wkt'),
        z.literal('dms'),
        z.literal('mgrs'),
        z.literal('multi'),
      ]),
    })
    .optional(),
});
