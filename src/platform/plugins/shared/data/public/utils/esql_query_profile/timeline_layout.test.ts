/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimelineDriver } from './types';
import { fullDomain, groupDrivers, laneBox } from './timeline_layout';

const driver = (description: string, startMillis: number, stopMillis: number) =>
  ({ description, startMillis, stopMillis } as TimelineDriver);

describe('laneBox', () => {
  const domain = { startMillis: 1_000, stopMillis: 1_200 };

  it('places a span on the track as percentages', () => {
    expect(laneBox(1_050, 1_150, domain)).toEqual({ left: 25, width: 50 });
  });

  it('keeps a very short span visible and inside the track', () => {
    expect(laneBox(1_100, 1_100, domain)).toEqual({ left: 50, width: 1.5 });
    expect(laneBox(1_200, 1_200, domain)).toEqual({ left: 98.5, width: 1.5 });
  });

  it('fills the track when the domain has no length', () => {
    expect(laneBox(5, 5, { startMillis: 5, stopMillis: 5 })).toEqual({ left: 0, width: 100 });
  });
});

describe('groupDrivers', () => {
  it('lists the known kinds of driver in execution order, then any others as they came', () => {
    const groups = groupDrivers([
      driver('final', 0, 1),
      driver('subplan-0.final', 0, 1),
      driver('data', 0, 1),
      driver('data', 0, 1),
      driver('node_reduce', 0, 1),
    ]);

    expect(groups.map(([description, drivers]) => [description, drivers.length])).toEqual([
      ['data', 2],
      ['node_reduce', 1],
      ['final', 1],
      ['subplan-0.final', 1],
    ]);
  });
});

describe('fullDomain', () => {
  it('covers the planning span and every driver', () => {
    expect(
      fullDomain({
        planning: { startMillis: 900, stopMillis: 1_000 },
        drivers: [driver('data', 1_000, 1_400), driver('final', 1_100, 1_300)],
      })
    ).toEqual({ startMillis: 900, stopMillis: 1_400 });
  });
});
