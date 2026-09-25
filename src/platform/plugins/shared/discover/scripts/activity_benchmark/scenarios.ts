/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import seedrandom from 'seedrandom';

export interface ExpectedIncrease {
  // Bucket indexes: start is included, end is not. These describe the injected signal.
  start: number;
  end: number;
  baseline: number;
  percentage: number | null;
}

export interface BenchmarkSeries {
  field: string;
  value: string | boolean | null;
  counts: number[];
  expected?: ExpectedIncrease;
}

export interface BenchmarkScenario {
  name: string;
  description: string;
  series: BenchmarkSeries[];
}

const BUCKET_COUNT = 48;
const CHANGE_START = 24;

/** Builds repeatable aggregate series; expected signals do not guarantee statistical significance. */
export const createScenarios = (seed: number, groupCount: number): BenchmarkScenario[] => {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(groupCount) || groupCount < 1) {
    throw new RangeError('Expected an integer seed and a positive integer group count');
  }

  const random = seedrandom(String(seed));
  const counts = (getCount: (bucket: number) => number) =>
    Array.from({ length: BUCKET_COUNT }, (_, bucket) => getCount(bucket));
  const series = (
    value: BenchmarkSeries['value'],
    getCount: (bucket: number) => number,
    expected?: ExpectedIncrease,
    field = 'category'
  ): BenchmarkSeries => ({ field, value, counts: counts(getCount), ...(expected && { expected }) });
  const expectation = (percentage: number | null, end = BUCKET_COUNT, baseline = 100) => ({
    start: CHANGE_START,
    end,
    baseline,
    percentage,
  });
  const scenario = (
    name: string,
    description: string,
    signals: BenchmarkSeries[],
    backgroundCount = 100,
    backgroundNoise = 0
  ): BenchmarkScenario => ({
    name,
    description,
    series: [
      ...signals,
      ...Array.from({ length: Math.max(0, groupCount - signals.length) }, (_, index) =>
        backgroundNoise > 0
          ? { ...noisyStep(0, backgroundNoise), value: `background-${index}` }
          : series(`background-${index}`, () => backgroundCount)
      ),
    ],
  });
  const noisyStep = (percentage: number, amplitude: number): BenchmarkSeries => {
    // Opposite noise in each pair keeps both phase means exactly at their target.
    const noise = Array.from({ length: BUCKET_COUNT / 2 }, () =>
      Math.round((random() * 2 - 1) * amplitude)
    );
    return series(
      'changed',
      (bucket) =>
        100 +
        (bucket >= CHANGE_START ? percentage : 0) +
        noise[Math.floor(bucket / 2)] * (bucket % 2 === 0 ? 1 : -1),
      percentage > 0 ? expectation(percentage) : undefined
    );
  };
  const poisson = (): number => {
    let product = 1;
    let count = 0;
    do {
      product *= random();
      count++;
    } while (product > Math.exp(-20));
    return count - 1;
  };

  return [
    scenario('stable', 'Constant counts: no injected increase.', []),
    scenario(
      'stationary-poisson',
      'Independent Poisson counts with constant rate 20; no paired noise or injected change.',
      Array.from({ length: groupCount }, (_, index) => series(`noise-${index}`, poisson))
    ),
    ...[0, 19, 20, 21, 30].flatMap((percentage) =>
      [0, 10, 40].map((amplitude) =>
        scenario(
          `step-${percentage}-noise-${amplitude}`,
          `A ${percentage}% step after bucket 23; balanced noise amplitude ${amplitude}.`,
          [noisyStep(percentage, amplitude)],
          100,
          amplitude
        )
      )
    ),
    scenario('spike', 'One bucket at 2.5 times the unchanged baseline.', [
      series('changed', (bucket) => (bucket === CHANGE_START ? 250 : 100), expectation(150, 25)),
    ]),
    scenario('sustained', 'Six elevated buckets, followed by a return to baseline.', [
      series(
        'changed',
        (bucket) => (bucket >= CHANGE_START && bucket < 30 ? 150 : 100),
        expectation(50, 30)
      ),
    ]),
    scenario('short-increase', 'Three elevated buckets, followed by a return to baseline.', [
      series(
        'changed',
        (bucket) => (bucket >= CHANGE_START && bucket < 27 ? 150 : 100),
        expectation(50, 27)
      ),
    ]),
    scenario('sustained-noisy', 'Six elevated buckets with balanced +/-10 count noise.', [
      series(
        'changed',
        (bucket) =>
          (bucket >= CHANGE_START && bucket < 30 ? 150 : 100) + (bucket % 2 ? 10 : -10),
        expectation(50, 30)
      ),
    ]),
    scenario(
      'trend',
      'A flat prefix followed by linear growth; +62.5% is the changed-window mean.',
      [
        series(
          'changed',
          (bucket) => (bucket < CHANGE_START ? 100 : 100 + (bucket - CHANGE_START + 1) * 5),
          expectation(62.5)
        ),
      ]
    ),
    scenario(
      'stable-total',
      'One group gains exactly what another loses; total volume stays flat.',
      [
        series('growing', (bucket) => (bucket < CHANGE_START ? 100 : 130), expectation(30)),
        series('compensating', (bucket) => (bucket < CHANGE_START ? 900 : 870)),
      ]
    ),
    scenario(
      'rare-group',
      'A small group triples but remains below the stable groups in total volume.',
      [series('rare', (bucket) => (bucket < CHANGE_START ? 5 : 15), expectation(200, 48, 5))],
      1000
    ),
    scenario(
      'daily-cycle',
      'Two repeated daily cycles with no new regime; not a seasonality model.',
      [series('periodic', (bucket) => Math.round(50 + 40 * Math.sin((bucket * Math.PI) / 12)))]
    ),
    scenario('daily-cycle-noisy', 'The same daily cycle with small independent count noise.', [
      series('periodic', (bucket) =>
        Math.round(100 + 40 * Math.sin((bucket * Math.PI) / 12) + (random() * 2 - 1) * 4)
      ),
    ]),
    scenario(
      'daily-cycle-with-increase',
      'A daily cycle plus a real +30% level increase; abstention must count as missed coverage.',
      [
        series(
          'periodic',
          (bucket) =>
            Math.round(100 + 40 * Math.sin((bucket * Math.PI) / 12)) +
            (bucket >= CHANGE_START ? 30 : 0),
          expectation(30)
        ),
      ]
    ),
    scenario('sparse', 'Repeated isolated counts separated by zeros, with no injected change.', [
      series('sparse', (bucket) => (bucket % 8 === 0 ? 1 : 0)),
    ]),
    scenario('zero-baseline', 'Activity starts after all-zero history; percentage is undefined.', [
      series('new', (bucket) => (bucket < CHANGE_START ? 0 : 10), expectation(null, 48, 0)),
    ]),
    scenario(
      'overlapping-and-missing',
      'Explicit aggregates: tag values can overlap, missing values have their own group, and boolean groups partition a field. Do not sum across fields or tags.',
      [
        series('red', (bucket) => (bucket < CHANGE_START ? 100 : 150), expectation(50), 'tags'),
        series('blue', (bucket) => (bucket < CHANGE_START ? 100 : 150), expectation(50), 'tags'),
        series(null, (bucket) => (bucket < CHANGE_START ? 100 : 130), expectation(30)),
        series(true, (bucket) => (bucket < CHANGE_START ? 100 : 130), expectation(30), 'flag'),
        series(false, (bucket) => (bucket < CHANGE_START ? 900 : 870), undefined, 'flag'),
      ]
    ),
  ];
};
