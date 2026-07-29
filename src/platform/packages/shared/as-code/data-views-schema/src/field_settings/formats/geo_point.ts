/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const geoPointFormatSchema = z
  .object({
    type: z.literal('geo_point'),
    params: z
      .object({
        transform: z
          .union([
            z.literal('lat_lon_string').meta({
              title: 'Lat lon string',
              description:
                'Transforms the geo point into a string in the format "latitude,longitude". For example "40.7128,-74.0060".',
            }),
            z.literal('wkt').meta({
              title: 'WKT',
              description:
                'Transforms the geo point into a Well-Known Text (WKT) string. For example "POINT (123.456 78.901)".',
            }),
            z.literal('dms').meta({
              title: 'DMS',
              description:
                'Transforms the geo point into a string in the format "latitude,longitude (degrees, minutes, seconds)". For example "40°42′50.2″N 73°59′45.6″W".',
            }),
            z.literal('mgrs').meta({
              title: 'MGRS',
              description:
                'Transforms the geo point into a string in the format "latitude,longitude (Military Grid Reference System)". For example "18SUJ1234567890".',
            }),
            z.literal('multi').meta({
              title: 'Multi',
              description:
                'Transforms the geo point to all the previous formats. For Example: "Lat Long: 40.7128,-74.0060, WKT: POINT (123.456 78.901), DMS: 40°42′50.2″N 73°59′45.6″W, MGRS: 18SUJ1234567890".',
            }),
          ])
          .meta({
            title: 'Transform',
            description: 'The transform to apply to the geo point value.',
          }),
      })
      .optional(),
  })
  .meta({
    id: 'kbn-field-format-geo_point',
    title: 'Geo point field format',
    description: 'Formats a field into a geo point value.',
  });
