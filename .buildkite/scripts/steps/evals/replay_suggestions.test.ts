/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReplayFixture } from './replay_suggestions.ts';
import {
  ACCEPTANCE_THRESHOLDS,
  meetsAcceptanceThresholds,
  scoreReplay,
  validateFixtures,
  selectFixtures,
  summarizeUnscored,
  NUDGE_THRESHOLDS,
  meetsNudgeThresholds,
  scoreNudge,
  validateNudgeFixtures,
} from './replay_suggestions.ts';

jest.mock('#pipeline-utils', () => ({ getPrChanges: jest.fn() }));

const fixture = (
  pr: number,
  kind: ReplayFixture['kind'],
  expectedSuiteIds: string[],
  split: ReplayFixture['split'] = 'tuning'
): ReplayFixture => ({ pr, kind, expectedSuiteIds, split });

describe('scoreReplay', () => {
  it('scores a perfect run', () => {
    const fixtures = [
      fixture(1, 'eval-worthy', ['agent-builder']),
      fixture(2, 'eval-worthy', ['ml', 'agent-builder']),
      fixture(3, 'ordinary', []),
    ];
    const results = [
      { pr: 1, suggestedSuiteIds: ['agent-builder'] },
      { pr: 2, suggestedSuiteIds: ['agent-builder', 'ml'] },
      { pr: 3, suggestedSuiteIds: [] },
    ];

    expect(scoreReplay(results, fixtures)).toEqual({
      precision: 1,
      recall: 1,
      ordinaryFalsePositiveRate: 0,
    });
  });

  it('counts a suggestion on an ordinary PR against precision and the false positive rate', () => {
    const fixtures = [
      fixture(1, 'eval-worthy', ['agent-builder']),
      fixture(2, 'ordinary', []),
      fixture(3, 'ordinary', []),
    ];
    const results = [
      { pr: 1, suggestedSuiteIds: ['agent-builder'] },
      { pr: 2, suggestedSuiteIds: ['ml'] },
      { pr: 3, suggestedSuiteIds: [] },
    ];

    expect(scoreReplay(results, fixtures)).toEqual({
      precision: 0.5,
      recall: 1,
      ordinaryFalsePositiveRate: 0.5,
    });
  });

  it('counts a wrong suite on an eval-worthy PR against precision', () => {
    const fixtures = [fixture(1, 'eval-worthy', ['agent-builder'])];
    const results = [{ pr: 1, suggestedSuiteIds: ['agent-builder', 'ml'] }];

    expect(scoreReplay(results, fixtures)).toMatchObject({ precision: 0.5, recall: 1 });
  });

  it('counts a missed suite against recall', () => {
    const fixtures = [
      fixture(1, 'eval-worthy', ['agent-builder', 'ml']),
      fixture(2, 'eval-worthy', ['esql-generation']),
    ];
    const results = [
      { pr: 1, suggestedSuiteIds: ['agent-builder'] },
      { pr: 2, suggestedSuiteIds: [] },
    ];

    expect(scoreReplay(results, fixtures)).toMatchObject({ precision: 1, recall: 1 / 3 });
  });

  it('treats a PR with no result as having no suggestions', () => {
    const fixtures = [fixture(1, 'eval-worthy', ['agent-builder'])];

    expect(scoreReplay([], fixtures)).toMatchObject({ recall: 0 });
  });

  it('is vacuously perfect on precision and the false positive rate when nothing applies', () => {
    expect(scoreReplay([], [])).toEqual({
      precision: 1,
      recall: 1,
      ordinaryFalsePositiveRate: 0,
    });
  });

  it('ignores a result for a PR that has no fixture', () => {
    const fixtures = [fixture(1, 'ordinary', [])];
    const results = [
      { pr: 1, suggestedSuiteIds: [] },
      { pr: 99, suggestedSuiteIds: ['ml'] },
    ];

    expect(scoreReplay(results, fixtures)).toMatchObject({ precision: 1 });
  });
});

describe('needs-new-coverage fixtures', () => {
  // A change can warrant evaluation while no registered suite exercises it. That is a coverage
  // gap, not a matcher miss, so it must not move precision, recall or the false positive rate.
  const fixtures = [
    fixture(1, 'eval-worthy', ['agent-builder']),
    fixture(2, 'ordinary', []),
    fixture(3, 'needs-new-coverage', []),
  ];

  it('leaves the score untouched whatever the matcher suggests for them', () => {
    const results = [
      { pr: 1, suggestedSuiteIds: ['agent-builder'] },
      { pr: 2, suggestedSuiteIds: [] },
    ];
    const withSuggestion = [...results, { pr: 3, suggestedSuiteIds: ['agent-builder', 'ml'] }];
    const withoutSuggestion = [...results, { pr: 3, suggestedSuiteIds: [] }];

    expect(scoreReplay(withSuggestion, fixtures)).toEqual(scoreReplay(withoutSuggestion, fixtures));
    expect(scoreReplay(withSuggestion, fixtures)).toEqual({
      precision: 1,
      recall: 1,
      ordinaryFalsePositiveRate: 0,
    });
  });

  it('reports what was suggested for them separately', () => {
    const results = [
      { pr: 1, suggestedSuiteIds: ['agent-builder'] },
      { pr: 3, suggestedSuiteIds: ['ml'] },
    ];

    expect(summarizeUnscored(results, fixtures)).toEqual([{ pr: 3, suggestedSuiteIds: ['ml'] }]);
  });

  it('reports a needs-new-coverage PR with no result as having no suggestions', () => {
    expect(summarizeUnscored([], fixtures)).toEqual([{ pr: 3, suggestedSuiteIds: [] }]);
  });
});

describe('meetsAcceptanceThresholds', () => {
  it('uses the agreed starting thresholds', () => {
    expect(ACCEPTANCE_THRESHOLDS).toEqual({
      minPrecision: 0.8,
      minRecall: 0.8,
      maxOrdinaryFalsePositiveRate: 0.1,
    });
  });

  it.each([
    ['exactly at every threshold', 0.8, 0.8, 0.1, true],
    ['precision just below', 0.79, 0.9, 0, false],
    ['recall just below', 0.9, 0.79, 0, false],
    ['false positive rate just above', 0.9, 0.9, 0.11, false],
  ])('is %s', (_name, precision, recall, ordinaryFalsePositiveRate, expected) => {
    expect(meetsAcceptanceThresholds({ precision, recall, ordinaryFalsePositiveRate })).toBe(
      expected
    );
  });
});

describe('validateFixtures', () => {
  const suiteIds = ['agent-builder', 'ml', 'alerting-v2'];
  const many = (
    count: number,
    kind: ReplayFixture['kind'],
    start: number,
    split: ReplayFixture['split']
  ) =>
    Array.from({ length: count }, (_, index) =>
      fixture(start + index, kind, kind === 'ordinary' ? [] : ['ml'], split)
    );
  const valid = [
    ...many(10, 'ordinary', 100, 'tuning'),
    ...many(5, 'ordinary', 200, 'acceptance'),
    ...many(10, 'eval-worthy', 300, 'tuning'),
    ...many(5, 'eval-worthy', 400, 'acceptance'),
  ];

  it('accepts a labelled set with enough PRs of each kind in both splits', () => {
    expect(validateFixtures(valid, suiteIds, ['ml'])).toEqual([]);
  });

  it('rejects a set that has too few PRs of each kind', () => {
    const problems = validateFixtures(valid.slice(0, 12), suiteIds, ['ml']);

    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ordinary'),
        expect.stringContaining('eval-worthy'),
      ])
    );
  });

  it('requires a non-empty acceptance split', () => {
    const tuningOnly = valid.map((entry) => ({ ...entry, split: 'tuning' as const }));

    expect(validateFixtures(tuningOnly, suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('acceptance')])
    );
  });

  it('rejects a set with every PR in one split, so no split is left unscored', () => {
    const allAcceptance = valid.map((entry) => ({ ...entry, split: 'acceptance' as const }));

    expect(validateFixtures(allAcceptance, suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('tuning')])
    );
  });

  it('requires at least 3 PRs of each kind in the acceptance split', () => {
    const thinAcceptance = [
      ...many(10, 'ordinary', 100, 'tuning'),
      ...many(10, 'eval-worthy', 300, 'tuning'),
      ...many(1, 'ordinary', 200, 'acceptance'),
      ...many(1, 'eval-worthy', 400, 'acceptance'),
      ...many(14, 'ordinary', 500, 'tuning'),
      ...many(14, 'eval-worthy', 600, 'tuning'),
    ];

    expect(validateFixtures(thinAcceptance, suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('acceptance')])
    );
  });

  it('requires at least 6 PRs of each kind in the tuning split', () => {
    const thinTuning = [
      ...many(3, 'ordinary', 100, 'tuning'),
      ...many(3, 'eval-worthy', 300, 'tuning'),
      ...many(20, 'ordinary', 200, 'acceptance'),
      ...many(20, 'eval-worthy', 400, 'acceptance'),
    ];

    expect(validateFixtures(thinTuning, suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('tuning')])
    );
  });

  it('accepts the smallest self-labeled set: 6 per kind in tuning and 3 in acceptance', () => {
    const smallest = [
      ...many(6, 'ordinary', 100, 'tuning'),
      ...many(6, 'eval-worthy', 300, 'tuning'),
      ...many(3, 'ordinary', 200, 'acceptance'),
      ...many(3, 'eval-worthy', 400, 'acceptance'),
    ];

    expect(validateFixtures(smallest, suiteIds, ['ml'])).toEqual([]);
  });

  it('rejects one PR fewer than that in either split', () => {
    const oneShort = [
      ...many(5, 'ordinary', 100, 'tuning'),
      ...many(6, 'eval-worthy', 300, 'tuning'),
      ...many(3, 'ordinary', 200, 'acceptance'),
      ...many(2, 'eval-worthy', 400, 'acceptance'),
    ];

    expect(validateFixtures(oneShort, suiteIds, ['ml'])).toEqual([
      expect.stringContaining('"ordinary" PRs in the tuning split'),
      expect.stringContaining('"eval-worthy" PRs in the acceptance split'),
    ]);
  });

  it('requires every seeded suite to be expected by at least one eval-worthy PR', () => {
    // `valid` only ever expects `ml`.
    const problems = validateFixtures(valid, suiteIds, ['ml', 'agent-builder', 'alerting-v2']);

    expect(problems).toEqual([
      expect.stringContaining('"agent-builder"'),
      expect.stringContaining('"alerting-v2"'),
    ]);
  });

  it('does not count a suite expected only by an ordinary PR as represented', () => {
    const problems = validateFixtures(
      [...valid, fixture(900, 'ordinary', ['alerting-v2'])],
      suiteIds,
      ['ml', 'alerting-v2']
    );

    expect(problems).toEqual(expect.arrayContaining([expect.stringContaining('"alerting-v2"')]));
  });

  it('does not count needs-new-coverage PRs toward the per-kind minimums', () => {
    const extra = Array.from({ length: 30 }, (_, index) =>
      fixture(700 + index, 'needs-new-coverage', [], 'tuning')
    );

    expect(validateFixtures([...valid.slice(0, 12), ...extra], suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('eval-worthy')])
    );
  });

  it('rejects a needs-new-coverage PR that expects a registered suite', () => {
    const bad = [fixture(2000, 'needs-new-coverage', ['ml'])];

    expect(validateFixtures([...valid, ...bad], suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('#2000')])
    );
  });

  it('accepts a needs-new-coverage PR that expects no suite', () => {
    const fine = [fixture(2000, 'needs-new-coverage', [])];

    expect(validateFixtures([...valid, ...fine], suiteIds, ['ml'])).toEqual([]);
  });

  it('rejects an ordinary PR that expects a suite and an eval-worthy PR that expects none', () => {
    const bad = [fixture(1, 'ordinary', ['ml']), fixture(2, 'eval-worthy', [])];

    expect(validateFixtures([...valid, ...bad], suiteIds, ['ml'])).toEqual(
      expect.arrayContaining([expect.stringContaining('#1'), expect.stringContaining('#2')])
    );
  });

  it('rejects an expected suite id that is not in the registry and a duplicated PR', () => {
    const bad = [fixture(100, 'eval-worthy', ['nope'])];

    const problems = validateFixtures([...valid, ...bad], suiteIds, ['ml']);

    expect(problems).toEqual(
      expect.arrayContaining([expect.stringContaining('"nope"'), expect.stringContaining('#100')])
    );
  });
});

describe('selectFixtures', () => {
  const fixtures = [fixture(1, 'ordinary', [], 'tuning'), fixture(2, 'ordinary', [], 'acceptance')];

  it.each([
    ['tuning', [1]],
    ['acceptance', [2]],
    ['all', [1, 2]],
  ] as const)('selects the %s split', (split, expected) => {
    expect(selectFixtures(fixtures, split).map(({ pr }) => pr)).toEqual(expected);
  });

  it('throws instead of scoring an empty selection as a pass', () => {
    expect(() => selectFixtures([fixture(1, 'ordinary', [], 'tuning')], 'acceptance')).toThrow(
      /no fixtures/i
    );
  });
});

describe('scoreNudge', () => {
  const fixtures = [
    fixture(1, 'needs-new-coverage', []),
    fixture(2, 'needs-new-coverage', []),
    fixture(3, 'ordinary', []),
    fixture(4, 'ordinary', []),
  ];

  it('scores a perfect run', () => {
    const results = [
      { pr: 1, fired: true },
      { pr: 2, fired: true },
      { pr: 3, fired: false },
      { pr: 4, fired: false },
    ];

    expect(scoreNudge(results, fixtures)).toEqual({ recall: 1, ordinaryFalsePositiveRate: 0 });
  });

  it('counts a missed needs-new-coverage PR against recall', () => {
    const results = [
      { pr: 1, fired: true },
      { pr: 2, fired: false },
      { pr: 3, fired: false },
      { pr: 4, fired: false },
    ];

    expect(scoreNudge(results, fixtures)).toMatchObject({ recall: 0.5 });
  });

  it('counts the nudge firing on an ordinary PR against the false positive rate', () => {
    const results = [
      { pr: 1, fired: true },
      { pr: 2, fired: true },
      { pr: 3, fired: true },
      { pr: 4, fired: false },
    ];

    expect(scoreNudge(results, fixtures)).toMatchObject({ ordinaryFalsePositiveRate: 0.5 });
  });

  it('ignores eval-worthy fixtures, which the suggestion score already covers', () => {
    const withEvalWorthy = [...fixtures, fixture(5, 'eval-worthy', ['ml'])];
    const results = [
      { pr: 1, fired: true },
      { pr: 2, fired: true },
      { pr: 3, fired: false },
      { pr: 4, fired: false },
      { pr: 5, fired: true },
    ];

    expect(scoreNudge(results, withEvalWorthy)).toEqual({
      recall: 1,
      ordinaryFalsePositiveRate: 0,
    });
  });

  it('treats a PR with no result as not fired', () => {
    expect(scoreNudge([], fixtures)).toEqual({ recall: 0, ordinaryFalsePositiveRate: 0 });
  });
});

describe('meetsNudgeThresholds', () => {
  it('uses the same starting targets as the suggestions', () => {
    expect(NUDGE_THRESHOLDS).toEqual({ minRecall: 0.8, maxOrdinaryFalsePositiveRate: 0.1 });
  });

  it.each([
    ['exactly at both thresholds', 0.8, 0.1, true],
    ['recall just below', 0.79, 0, false],
    ['false positive rate just above', 1, 0.11, false],
  ])('is %s', (_name, recall, ordinaryFalsePositiveRate, expected) => {
    expect(meetsNudgeThresholds({ recall, ordinaryFalsePositiveRate })).toBe(expected);
  });
});

describe('validateNudgeFixtures', () => {
  const many = (
    count: number,
    kind: ReplayFixture['kind'],
    start: number,
    split: ReplayFixture['split']
  ) => Array.from({ length: count }, (_, index) => fixture(start + index, kind, [], split));
  const valid = [
    ...many(6, 'needs-new-coverage', 100, 'tuning'),
    ...many(3, 'needs-new-coverage', 200, 'acceptance'),
    ...many(6, 'ordinary', 300, 'tuning'),
    ...many(3, 'ordinary', 400, 'acceptance'),
  ];

  it('accepts the smallest self-labeled set', () => {
    expect(validateNudgeFixtures(valid)).toEqual([]);
  });

  it('requires 6 per kind in tuning and 3 in acceptance', () => {
    const problems = validateNudgeFixtures([
      ...many(5, 'needs-new-coverage', 100, 'tuning'),
      ...many(3, 'needs-new-coverage', 200, 'acceptance'),
      ...many(6, 'ordinary', 300, 'tuning'),
      ...many(2, 'ordinary', 400, 'acceptance'),
    ]);

    expect(problems).toEqual([
      expect.stringContaining('"needs-new-coverage" PRs in the tuning split'),
      expect.stringContaining('"ordinary" PRs in the acceptance split'),
    ]);
  });

  it('rejects a duplicated PR and a fixture that expects a registered suite', () => {
    const bad = [fixture(100, 'ordinary', []), fixture(900, 'needs-new-coverage', ['ml'])];

    expect(validateNudgeFixtures([...valid, ...bad])).toEqual(
      expect.arrayContaining([expect.stringContaining('#100'), expect.stringContaining('#900')])
    );
  });

  it('rejects an eval-worthy fixture, which belongs in the suggestion fixtures', () => {
    expect(validateNudgeFixtures([...valid, fixture(901, 'eval-worthy', ['ml'])])).toEqual(
      expect.arrayContaining([expect.stringContaining('#901')])
    );
  });
});
