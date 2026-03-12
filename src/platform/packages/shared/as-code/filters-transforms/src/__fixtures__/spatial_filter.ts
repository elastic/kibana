/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const spatialFilterFixture = {
  meta: {
    type: 'spatial_filter',
    negate: false,
    alias: 'intersects shape',
    disabled: false,
    isMultiIndex: true,
  },
  query: {
    bool: {
      should: [
        {
          bool: {
            must: [
              {
                exists: {
                  field: 'DestLocation',
                },
              },
              {
                geo_shape: {
                  ignore_unmapped: true,
                  DestLocation: {
                    relation: 'intersects',
                    shape: {
                      coordinates: [
                        [
                          [-116.98646, 49.95363],
                          [-69.4932, 36.01698],
                          [-89.978, 27.62399],
                          [-114.50929, 36.07558],
                          [-116.98646, 49.95363],
                        ],
                      ],
                      type: 'Polygon',
                    },
                  },
                },
              },
            ],
          },
        },
        {
          bool: {
            must: [
              {
                exists: {
                  field: 'geo.coordinates',
                },
              },
              {
                geo_shape: {
                  ignore_unmapped: true,
                  'geo.coordinates': {
                    relation: 'intersects',
                    shape: {
                      coordinates: [
                        [
                          [-116.98646, 49.95363],
                          [-69.4932, 36.01698],
                          [-89.978, 27.62399],
                          [-114.50929, 36.07558],
                          [-116.98646, 49.95363],
                        ],
                      ],
                      type: 'Polygon',
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  $state: {
    store: 'appState',
  },
} as const;
