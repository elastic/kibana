/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceStatus, ServiceStatusLevels } from './types';
import { getSummaryStatus } from './get_summary_status';

describe('getSummaryStatus', () => {
  const available: ServiceStatus = { level: ServiceStatusLevels.available, summary: 'Available' };
  const degraded: ServiceStatus = {
    level: ServiceStatusLevels.degraded,
    summary: 'This is degraded!',
  };
  const unavailable: ServiceStatus = {
    level: ServiceStatusLevels.unavailable,
    summary: 'This is unavailable!',
  };
  const critical: ServiceStatus = {
    level: ServiceStatusLevels.critical,
    summary: 'This is critical!',
  };

  it('returns available when all status are available', () => {
    expect(
      getSummaryStatus(
        Object.entries({
          s1: available,
          s2: available,
          s3: available,
        })
      )
    ).toMatchObject({
      level: ServiceStatusLevels.available,
    });
  });

  it('returns degraded when the worst status is degraded', () => {
    expect(
      getSummaryStatus(
        Object.entries({
          s1: available,
          s2: degraded,
          s3: available,
        })
      )
    ).toMatchObject({
      level: ServiceStatusLevels.degraded,
    });
  });

  it('returns unavailable when the worst status is unavailable', () => {
    expect(
      getSummaryStatus(
        Object.entries({
          s1: available,
          s2: degraded,
          s3: unavailable,
        })
      )
    ).toMatchObject({
      level: ServiceStatusLevels.unavailable,
    });
  });

  it('returns critical when the worst status is critical', () => {
    expect(
      getSummaryStatus(
        Object.entries({
          s1: critical,
          s2: degraded,
          s3: unavailable,
        })
      )
    ).toMatchObject({
      level: ServiceStatusLevels.critical,
    });
  });

  describe('summary', () => {
    it('returns correct summary when a single service is affected', () => {
      expect(
        getSummaryStatus(
          Object.entries({
            s1: degraded,
            s2: {
              level: ServiceStatusLevels.unavailable,
              summary: 'Lorem ipsum',
              meta: {
                custom: { data: 'here' },
              },
            },
          })
        )
      ).toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: '1 service is unavailable: s2',
        detail: 'See the status page for more information',
        meta: {
          affectedServices: ['s2'],
        },
      });
    });

    it('returns correct summary when multiple services are affected', () => {
      expect(
        getSummaryStatus(
          Object.entries({
            s1: degraded,
            s2: {
              level: ServiceStatusLevels.unavailable,
              summary: 'Lorem ipsum',
              detail: 'Vivamus pulvinar sem ac luctus ultrices.',
              documentationUrl: 'http://helpmenow.com/problem1',
              meta: {
                custom: { data: 'here' },
              },
            },
            s3: {
              level: ServiceStatusLevels.unavailable,
              summary: 'Proin mattis',
              detail: 'Nunc quis nulla at mi lobortis pretium.',
              documentationUrl: 'http://helpmenow.com/problem2',
              meta: {
                other: { data: 'over there' },
              },
            },
          })
        )
      ).toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: '2 services are unavailable: s2, s3',
        detail: 'See the status page for more information',
        meta: {
          affectedServices: ['s2', 's3'],
        },
      });
    });

    it('returns correct summary more than `maxServices` services are affected', () => {
      expect(
        getSummaryStatus(
          Object.entries({
            s1: degraded,
            s2: available,
            s3: degraded,
            s4: degraded,
            s5: degraded,
            s6: available,
            s7: degraded,
          }),
          { maxServices: 3 }
        )
      ).toEqual({
        level: ServiceStatusLevels.degraded,
        summary: '5 services are degraded: s1, s3, s4 and 2 other(s)',
        detail: 'See the status page for more information',
        meta: {
          affectedServices: ['s1', 's3', 's4', 's5', 's7'],
        },
      });
    });
  });
});
