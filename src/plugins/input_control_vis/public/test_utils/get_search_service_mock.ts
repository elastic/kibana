/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const getSearchSourceMock = (esSearchResponse?: any) =>
  jest.fn().mockImplementation(() => ({
    setParent: jest.fn(),
    setField: jest.fn(),
    fetch: jest.fn().mockResolvedValue(
      esSearchResponse
        ? esSearchResponse
        : {
            aggregations: {
              termsAgg: {
                buckets: [
                  {
                    key: 'Zurich Airport',
                    doc_count: 691,
                  },
                  {
                    key: 'Xi an Xianyang International Airport',
                    doc_count: 526,
                  },
                ],
              },
            },
          }
    ),
  }));
