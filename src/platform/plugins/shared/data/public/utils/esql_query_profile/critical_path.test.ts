/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { findCriticalPath, findStraggler } from './critical_path';

interface DriverSpec {
  description: string;
  start: number;
  stop: number;
  sleeps?: Array<{ reason: string; from: number; to: number }>;
}

const build = (specs: DriverSpec[]) =>
  aggregateEsqlProfile({
    drivers: specs.map((spec) => ({
      description: spec.description,
      start_millis: 1_000 + spec.start,
      stop_millis: 1_000 + spec.stop,
      sleeps: spec.sleeps
        ? {
            counts: { [spec.sleeps[0].reason]: spec.sleeps.length },
            first: spec.sleeps.map((sleep) => ({
              reason: sleep.reason,
              thread_name: 't',
              sleep_millis: 1_000 + sleep.from,
              wake_millis: 1_000 + sleep.to,
            })),
            last: spec.sleeps.map((sleep) => ({
              reason: sleep.reason,
              thread_name: 't',
              sleep_millis: 1_000 + sleep.from,
              wake_millis: 1_000 + sleep.to,
            })),
          }
        : undefined,
    })),
  });

/** Ten data drivers that finish by 29, one that finishes at 46, and a final driver that waits for it. */
const stragglerView = build([
  ...Array.from({ length: 10 }, (_, index) => ({
    description: 'data',
    start: 2 + (index % 2),
    stop: 29,
  })),
  { description: 'data', start: 2, stop: 46 },
  {
    description: 'final',
    start: 1,
    stop: 47,
    sleeps: [{ reason: 'exchange empty', from: 16, to: 46 }],
  },
]);

describe('findCriticalPath', () => {
  it('follows the last driver to the one it was waiting for', () => {
    const path = findCriticalPath(stragglerView);

    // The final driver, then the data driver that finished when it woke up.
    expect(path?.driverIds).toEqual(['11', '10']);
    expect(path?.links).toEqual([{ fromId: '10', toId: '11', atMillis: 1_046 }]);
  });

  it('follows the chain through every stage, such as a subquery into the outer query', () => {
    const view = build([
      { description: 'data', start: 2, stop: 10 },
      { description: 'data', start: 2, stop: 50 },
      {
        description: 'subplan-0.final',
        start: 2,
        stop: 50,
        sleeps: [{ reason: 'exchange empty', from: 10, to: 50 }],
      },
      {
        description: 'main.final',
        start: 2,
        stop: 51,
        sleeps: [{ reason: 'exchange empty', from: 3, to: 50 }],
      },
    ]);

    expect(findCriticalPath(view)?.driverIds).toEqual(['3', '2', '1']);
  });

  it('prefers the stage right before a driver to a data driver that finished at the same time', () => {
    const view = build([
      { description: 'data', start: 2, stop: 50 },
      { description: 'data', start: 2, stop: 50 },
      {
        description: 'subplan-0.final',
        start: 2,
        stop: 50,
        sleeps: [{ reason: 'exchange empty', from: 10, to: 50 }],
      },
      {
        description: 'main.final',
        start: 2,
        stop: 51,
        sleeps: [{ reason: 'exchange empty', from: 3, to: 50 }],
      },
    ]);

    // The outer query waited for the subquery, which waited for the data driver.
    expect(findCriticalPath(view)?.driverIds.slice(0, 2)).toEqual(['3', '2']);
  });

  it('picks the driver that finished closest to the wake up, the longest running if they tie', () => {
    const view = build([
      { description: 'data', start: 2, stop: 30 },
      { description: 'data', start: 2, stop: 40 },
      { description: 'data', start: 20, stop: 40 },
      {
        description: 'final',
        start: 1,
        stop: 41,
        sleeps: [{ reason: 'exchange empty', from: 5, to: 40 }],
      },
    ]);

    expect(findCriticalPath(view)?.driverIds).toEqual(['3', '1']);
  });

  it('stops where the wake up is not explained by another driver finishing', () => {
    const unexplained = build([
      { description: 'data', start: 2, stop: 10 },
      {
        description: 'final',
        start: 1,
        stop: 47,
        sleeps: [{ reason: 'exchange empty', from: 16, to: 30 }],
      },
    ]);

    expect(findCriticalPath(unexplained)).toBeUndefined();
  });

  it('does not follow a wait that is not for data, such as back-pressure', () => {
    const backPressure = build([
      { description: 'data', start: 2, stop: 46 },
      {
        description: 'final',
        start: 1,
        stop: 47,
        sleeps: [{ reason: 'exchange full', from: 16, to: 46 }],
      },
    ]);

    expect(findCriticalPath(backPressure)).toBeUndefined();
  });

  it('has nothing to follow with fewer than two drivers, or when nothing waited', () => {
    expect(findCriticalPath(build([{ description: 'data', start: 0, stop: 10 }]))).toBeUndefined();
    expect(
      findCriticalPath(
        build([
          { description: 'data', start: 0, stop: 10 },
          { description: 'final', start: 0, stop: 11 },
        ])
      )
    ).toBeUndefined();
  });

  it('allows a millisecond of clock difference between the finish and the wake up', () => {
    const view = build([
      { description: 'data', start: 2, stop: 45 },
      {
        description: 'final',
        start: 1,
        stop: 47,
        sleeps: [{ reason: 'exchange empty', from: 16, to: 46 }],
      },
    ]);

    expect(findCriticalPath(view)?.driverIds).toEqual(['1', '0']);
  });
});

describe('findStraggler', () => {
  it('names the driver that finished long after the others of its kind', () => {
    const path = findCriticalPath(stragglerView);
    const straggler = path && findStraggler(stragglerView, path);

    // Measured from the start of the first driver, which began a millisecond before the others.
    expect(straggler).toEqual({
      driverId: '10',
      lagMillis: 17,
      typicalFinishMillis: 28,
      startMillis: 1,
      startedLate: false,
    });
  });

  it('says nothing when the driver is close to its peers, or has too few of them', () => {
    const close = build([
      ...Array.from({ length: 5 }, () => ({ description: 'data', start: 2, stop: 45 })),
      { description: 'data', start: 2, stop: 46 },
      {
        description: 'final',
        start: 1,
        stop: 47,
        sleeps: [{ reason: 'exchange empty', from: 16, to: 46 }],
      },
    ]);
    const closePath = findCriticalPath(close);
    expect(closePath && findStraggler(close, closePath)).toBeUndefined();

    const alone = build([
      { description: 'data', start: 2, stop: 46 },
      {
        description: 'final',
        start: 1,
        stop: 47,
        sleeps: [{ reason: 'exchange empty', from: 16, to: 46 }],
      },
    ]);
    const alonePath = findCriticalPath(alone);
    expect(alonePath && findStraggler(alone, alonePath)).toBeUndefined();
  });

  it('says a driver started late when it began about when its peers finished', () => {
    const view = build([
      ...Array.from({ length: 6 }, () => ({ description: 'data', start: 2, stop: 29 })),
      // This one waited for a free thread, and ran for 17 ms once it had one.
      { description: 'data', start: 29, stop: 46 },
      {
        description: 'final',
        start: 1,
        stop: 47,
        sleeps: [{ reason: 'exchange empty', from: 16, to: 46 }],
      },
    ]);
    const path = findCriticalPath(view);

    expect(path && findStraggler(view, path)).toMatchObject({
      driverId: '6',
      lagMillis: 17,
      startedLate: true,
    });
  });

  it('only compares a driver with the data drivers of its own stage', () => {
    const view = build([
      // The first subquery is quick, so its drivers are no measure of the second.
      ...Array.from({ length: 4 }, () => ({ description: 'data', start: 2, stop: 6 })),
      {
        description: 'subplan-1.final',
        start: 2,
        stop: 8,
        sleeps: [{ reason: 'exchange empty', from: 3, to: 7 }],
      },
      ...Array.from({ length: 5 }, () => ({ description: 'data', start: 2, stop: 33 })),
      { description: 'data', start: 31, stop: 48 },
      {
        description: 'subplan-0.final',
        start: 2,
        stop: 49,
        sleeps: [{ reason: 'exchange empty', from: 10, to: 48 }],
      },
    ]);
    const path = findCriticalPath(view);

    expect(path && findStraggler(view, path)).toMatchObject({
      driverId: '10',
      lagMillis: 15,
      startedLate: true,
    });
  });
});
