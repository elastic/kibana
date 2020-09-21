/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    describe('when a single service is at highest level', () => {
      it('returns all information about that single service', () => {
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
          summary: '[s2]: Lorem ipsum',
          detail: 'See the status page for more information',
          meta: {
            affectedServices: {
              s2: {
                level: ServiceStatusLevels.unavailable,
                summary: 'Lorem ipsum',
                meta: {
                  custom: { data: 'here' },
                },
              },
            },
          },
        });
      });

      it('allows the single service to override the detail and documentationUrl fields', () => {
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
            })
          )
        ).toEqual({
          level: ServiceStatusLevels.unavailable,
          summary: '[s2]: Lorem ipsum',
          detail: 'Vivamus pulvinar sem ac luctus ultrices.',
          documentationUrl: 'http://helpmenow.com/problem1',
          meta: {
            affectedServices: {
              s2: {
                level: ServiceStatusLevels.unavailable,
                summary: 'Lorem ipsum',
                detail: 'Vivamus pulvinar sem ac luctus ultrices.',
                documentationUrl: 'http://helpmenow.com/problem1',
                meta: {
                  custom: { data: 'here' },
                },
              },
            },
          },
        });
      });
    });

    describe('when multiple services is at highest level', () => {
      it('returns aggregated information about the affected services', () => {
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
          summary: '[2] services are unavailable',
          detail: 'See the status page for more information',
          meta: {
            affectedServices: {
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
            },
          },
        });
      });
    });
  });
});
