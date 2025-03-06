/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shouldShowDeprecatedHistogramIntervalInfo } from './deprecated_interval_info';

describe('shouldShowDeprecatedHistogramIntervalInfo', () => {
  test('should show deprecated histogram interval', () => {
    expect(
      shouldShowDeprecatedHistogramIntervalInfo({
        data: {
          url: {
            body: {
              aggs: {
                test: {
                  date_histogram: {
                    interval: 'day',
                  },
                },
              },
            },
          },
        },
      })
    ).toBeTruthy();

    expect(
      shouldShowDeprecatedHistogramIntervalInfo({
        data: [
          {
            url: {
              body: {
                aggs: {
                  test: {
                    date_histogram: {
                      interval: 'day',
                    },
                  },
                },
              },
            },
          },
          {
            url: {
              body: {
                aggs: {
                  test: {
                    date_histogram: {
                      calendar_interval: 'day',
                    },
                  },
                },
              },
            },
          },
        ],
      })
    ).toBeTruthy();
  });

  test('should not show deprecated histogram interval', () => {
    expect(
      shouldShowDeprecatedHistogramIntervalInfo({
        data: {
          url: {
            body: {
              aggs: {
                test: {
                  date_histogram: {
                    interval: { '%autointerval%': true },
                  },
                },
              },
            },
          },
        },
      })
    ).toBeFalsy();

    expect(
      shouldShowDeprecatedHistogramIntervalInfo({
        data: {
          url: {
            body: {
              aggs: {
                test: {
                  auto_date_histogram: {
                    field: 'bytes',
                  },
                },
              },
            },
          },
        },
      })
    ).toBeFalsy();

    expect(
      shouldShowDeprecatedHistogramIntervalInfo({
        data: [
          {
            url: {
              body: {
                aggs: {
                  test: {
                    date_histogram: {
                      calendar_interval: 'week',
                    },
                  },
                },
              },
            },
          },
          {
            url: {
              body: {
                aggs: {
                  test: {
                    date_histogram: {
                      fixed_interval: '23d',
                    },
                  },
                },
              },
            },
          },
        ],
      })
    ).toBeFalsy();
  });
});
