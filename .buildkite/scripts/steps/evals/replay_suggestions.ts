/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Measures the PR suggester against PRs whose expected suites were labelled by hand, to decide
// whether commenting can be switched on. Read-only: it fetches PR files and prints a score.
//
//   node .buildkite/scripts/steps/evals/replay_suggestions.ts [--split tuning|acceptance|all]
//   node .buildkite/scripts/steps/evals/replay_suggestions.ts --check   (validate fixtures only)
//   node .buildkite/scripts/steps/evals/replay_suggestions.ts --nudge [--split ...] [--check]
//     scores the "no matching suite mapping" nudge against nudge_fixtures.json
//
// Tune `coverage` globs against `tuning` only. Judge `acceptance` once, after tuning stops; if it
// fails, label a fresh acceptance set instead of re-tuning against it.

import Fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { readEvalsSuiteMetadata } from '../../../pipelines/evals/eval_pipeline.ts';
import { getEvalSuggestions } from '../../../pipelines/evals/evals_suggestions.ts';
import { listSkillDirs } from '../../../pipelines/evals/skill_dirs.ts';
import { getPrChanges } from '#pipeline-utils';

export interface ReplayFixture {
  pr: number;
  // `needs-new-coverage`: the change warrants evaluation but no registered suite exercises it. That
  // is a coverage gap, not a matcher miss, so such PRs are reported but never scored.
  kind: 'ordinary' | 'eval-worthy' | 'needs-new-coverage';
  expectedSuiteIds: string[];
  split: 'tuning' | 'acceptance';
}

export interface ReplayResult {
  pr: number;
  suggestedSuiteIds: string[];
}

export interface ReplayScore {
  /** Correct (PR, suite) suggestions over all suggestions made. */
  precision: number;
  /** Expected (PR, suite) pairs on eval-worthy PRs that were suggested. */
  recall: number;
  /** Share of ordinary PRs that got any suggestion. */
  ordinaryFalsePositiveRate: number;
}

// Starting targets agreed with reviewers; adjust the globs to meet them, never the thresholds.
export const ACCEPTANCE_THRESHOLDS = {
  minPrecision: 0.8,
  minRecall: 0.8,
  maxOrdinaryFalsePositiveRate: 0.1,
} as const;

// Per split and kind. A split too thin to score would let a run pass on almost nothing.
//
// These are the minimums for a small self-labeled set, enough to catch an obviously broken matcher.
// With so few PRs one miss moves recall by 10 points or more, so a pass here is a smoke check, not
// evidence for rolling the suggester out to other teams. Raise them if the set is ever labeled by
// the suite owners.
const MIN_PRS_PER_KIND_PER_SPLIT = { tuning: 6, acceptance: 3 } as const;

const ratio = (numerator: number, denominator: number, whenEmpty: number): number =>
  denominator === 0 ? whenEmpty : numerator / denominator;

export const scoreReplay = (results: ReplayResult[], allFixtures: ReplayFixture[]): ReplayScore => {
  const fixtures = allFixtures.filter(({ kind }) => kind !== 'needs-new-coverage');
  const suggestedByPr = new Map(
    results.map(({ pr, suggestedSuiteIds }) => [pr, suggestedSuiteIds])
  );
  const suggestedFor = (fixture: ReplayFixture): string[] => suggestedByPr.get(fixture.pr) ?? [];

  const suggestedPairs = fixtures.reduce((sum, fixture) => sum + suggestedFor(fixture).length, 0);
  const correctPairs = fixtures.reduce(
    (sum, fixture) =>
      sum + suggestedFor(fixture).filter((id) => fixture.expectedSuiteIds.includes(id)).length,
    0
  );

  const evalWorthy = fixtures.filter(({ kind }) => kind === 'eval-worthy');
  const expectedPairs = evalWorthy.reduce(
    (sum, fixture) => sum + fixture.expectedSuiteIds.length,
    0
  );
  const foundPairs = evalWorthy.reduce(
    (sum, fixture) =>
      sum + fixture.expectedSuiteIds.filter((id) => suggestedFor(fixture).includes(id)).length,
    0
  );

  const ordinary = fixtures.filter(({ kind }) => kind === 'ordinary');
  const ordinaryWithSuggestion = ordinary.filter((fixture) => suggestedFor(fixture).length > 0);

  return {
    precision: ratio(correctPairs, suggestedPairs, 1),
    recall: ratio(foundPairs, expectedPairs, 1),
    ordinaryFalsePositiveRate: ratio(ordinaryWithSuggestion.length, ordinary.length, 0),
  };
};

export const meetsAcceptanceThresholds = ({
  precision,
  recall,
  ordinaryFalsePositiveRate,
}: ReplayScore): boolean =>
  precision >= ACCEPTANCE_THRESHOLDS.minPrecision &&
  recall >= ACCEPTANCE_THRESHOLDS.minRecall &&
  ordinaryFalsePositiveRate <= ACCEPTANCE_THRESHOLDS.maxOrdinaryFalsePositiveRate;

export interface NudgeResult {
  pr: number;
  /** Whether the "no matching suite mapping" nudge listed any file. */
  fired: boolean;
}

export interface NudgeScore {
  /** `needs-new-coverage` PRs the nudge fired on. */
  recall: number;
  /** Share of ordinary PRs the nudge fired on. */
  ordinaryFalsePositiveRate: number;
}

// Same starting targets as the suggestions; tune the patterns, never the thresholds.
export const NUDGE_THRESHOLDS = { minRecall: 0.8, maxOrdinaryFalsePositiveRate: 0.1 } as const;

/** Scores the "consider adding eval coverage" nudge. Eval-worthy fixtures belong to `scoreReplay`. */
export const scoreNudge = (results: NudgeResult[], allFixtures: ReplayFixture[]): NudgeScore => {
  const firedByPr = new Map(results.map(({ pr, fired }) => [pr, fired]));
  const firedOn = (fixture: ReplayFixture): boolean => firedByPr.get(fixture.pr) ?? false;

  const needsCoverage = allFixtures.filter(({ kind }) => kind === 'needs-new-coverage');
  const ordinary = allFixtures.filter(({ kind }) => kind === 'ordinary');

  return {
    recall: ratio(needsCoverage.filter(firedOn).length, needsCoverage.length, 1),
    ordinaryFalsePositiveRate: ratio(ordinary.filter(firedOn).length, ordinary.length, 0),
  };
};

export const meetsNudgeThresholds = ({ recall, ordinaryFalsePositiveRate }: NudgeScore): boolean =>
  recall >= NUDGE_THRESHOLDS.minRecall &&
  ordinaryFalsePositiveRate <= NUDGE_THRESHOLDS.maxOrdinaryFalsePositiveRate;

/** Problems that make the nudge fixtures unfit to gate on; empty when they are sound. */
export const validateNudgeFixtures = (fixtures: ReplayFixture[]): string[] => {
  const problems: string[] = [];

  for (const split of ['tuning', 'acceptance'] as const) {
    for (const kind of ['needs-new-coverage', 'ordinary'] as const) {
      const count = fixtures.filter(
        (fixture) => fixture.split === split && fixture.kind === kind
      ).length;
      const minimum = MIN_PRS_PER_KIND_PER_SPLIT[split];
      if (count < minimum) {
        problems.push(
          `only ${count} "${kind}" PRs in the ${split} split, need at least ${minimum}`
        );
      }
    }
  }

  const seen = new Set<number>();
  for (const { pr, kind, expectedSuiteIds } of fixtures) {
    if (seen.has(pr)) {
      problems.push(`#${pr}: listed more than once`);
    }
    seen.add(pr);

    if (kind === 'eval-worthy') {
      problems.push(`#${pr}: an eval-worthy PR belongs in replay_fixtures.json, not here`);
    }
    if (expectedSuiteIds.length > 0) {
      problems.push(`#${pr}: a nudge fixture cannot expect a registered suite`);
    }
  }

  return problems;
};

/** What the matcher suggested for the PRs that are reported but not scored. */
export const summarizeUnscored = (
  results: ReplayResult[],
  fixtures: ReplayFixture[]
): ReplayResult[] => {
  const suggestedByPr = new Map(
    results.map(({ pr, suggestedSuiteIds }) => [pr, suggestedSuiteIds])
  );
  return fixtures
    .filter(({ kind }) => kind === 'needs-new-coverage')
    .map(({ pr }) => ({ pr, suggestedSuiteIds: suggestedByPr.get(pr) ?? [] }));
};

/** Problems that make a fixture file unfit to gate on; empty when it is sound. */
export const validateFixtures = (
  fixtures: ReplayFixture[],
  suiteIds: string[],
  seededSuiteIds: string[]
): string[] => {
  const problems: string[] = [];

  for (const split of ['tuning', 'acceptance'] as const) {
    for (const kind of ['ordinary', 'eval-worthy'] as const) {
      const count = fixtures.filter(
        (fixture) => fixture.split === split && fixture.kind === kind
      ).length;
      const minimum = MIN_PRS_PER_KIND_PER_SPLIT[split];
      if (count < minimum) {
        problems.push(
          `only ${count} "${kind}" PRs in the ${split} split, need at least ${minimum}`
        );
      }
    }
  }

  // A seeded suite no eval-worthy PR expects has unmeasured recall, so a pass says nothing about it.
  const representedSuiteIds = new Set(
    fixtures
      .filter(({ kind }) => kind === 'eval-worthy')
      .flatMap((fixture) => fixture.expectedSuiteIds)
  );
  for (const id of seededSuiteIds.filter((suiteId) => !representedSuiteIds.has(suiteId))) {
    problems.push(`no eval-worthy PR expects the seeded suite "${id}"`);
  }

  const seen = new Set<number>();
  for (const { pr, kind, expectedSuiteIds } of fixtures) {
    if (seen.has(pr)) {
      problems.push(`#${pr}: listed more than once`);
    }
    seen.add(pr);

    if (kind === 'ordinary' && expectedSuiteIds.length > 0) {
      problems.push(`#${pr}: an ordinary PR cannot expect suites`);
    }
    if (kind === 'needs-new-coverage' && expectedSuiteIds.length > 0) {
      problems.push(`#${pr}: a needs-new-coverage PR cannot expect a registered suite`);
    }
    if (kind === 'eval-worthy' && expectedSuiteIds.length === 0) {
      problems.push(`#${pr}: an eval-worthy PR must expect at least one suite`);
    }
    for (const id of expectedSuiteIds.filter((suiteId) => !suiteIds.includes(suiteId))) {
      problems.push(`#${pr}: unknown suite "${id}"`);
    }
  }

  return problems;
};

export const selectFixtures = (
  fixtures: ReplayFixture[],
  split: 'tuning' | 'acceptance' | 'all'
): ReplayFixture[] => {
  const selected = fixtures.filter((fixture) => split === 'all' || fixture.split === split);
  if (selected.length === 0) {
    // An empty set scores as a perfect pass, so refuse to score it.
    throw new Error(`No fixtures in the ${split} split; refusing to score an empty set.`);
  }
  return selected;
};

const parseSplit = (argv: string[]): 'tuning' | 'acceptance' | 'all' => {
  const value = argv[argv.indexOf('--split') + 1];
  return value === 'acceptance' || value === 'all' ? value : 'tuning';
};

const runNudge = async (argv: string[]): Promise<number> => {
  const split = parseSplit(argv);
  const fixturesPath = join(dirname(process.argv[1]), 'nudge_fixtures.json');
  const fixtures = JSON.parse(Fs.readFileSync(fixturesPath, 'utf-8')) as ReplayFixture[];

  const problems = validateNudgeFixtures(fixtures);
  if (problems.length > 0) {
    console.error(`nudge_fixtures.json is not ready to gate on:\n- ${problems.join('\n- ')}`);
    return 1;
  }
  if (argv.includes('--check')) {
    console.log(`nudge_fixtures.json is valid (${fixtures.length} fixtures). Matcher not run.`);
    return 0;
  }
  if (split !== 'tuning') {
    console.log('Acceptance PRs are judged once, after tuning stops. Do not tune against them.\n');
  }

  const suites = readEvalsSuiteMetadata();
  const skillDirs = listSkillDirs();
  const selected = selectFixtures(fixtures, split);
  const results: NudgeResult[] = [];
  for (const { pr, kind } of selected) {
    const changes = await getPrChanges('elastic', 'kibana', pr);
    const { unmappedLlmFiles } = getEvalSuggestions({ changes, suites, labels: [], skillDirs });
    results.push({ pr, fired: unmappedLlmFiles.length > 0 });
    const shown = split === 'tuning' ? ` ${unmappedLlmFiles.slice(0, 2).join(' ; ')}` : '';
    console.log(`#${pr} ${kind} fired=${unmappedLlmFiles.length > 0}${shown}`);
  }

  const score = scoreNudge(results, selected);
  const passed = meetsNudgeThresholds(score);
  console.log(`\n${JSON.stringify(score, null, 2)}`);
  console.log(`Thresholds ${JSON.stringify(NUDGE_THRESHOLDS)}: ${passed ? 'PASS' : 'FAIL'}`);

  return passed ? 0 : 1;
};

export const main = async (argv: string[]): Promise<number> => {
  if (argv.includes('--nudge')) {
    return runNudge(argv);
  }

  const split = parseSplit(argv);
  // `main` only runs as the entry script, so its own directory is the fixtures directory.
  const fixturesPath = join(dirname(process.argv[1]), 'replay_fixtures.json');
  const fixtures = JSON.parse(Fs.readFileSync(fixturesPath, 'utf-8')) as ReplayFixture[];
  const suites = readEvalsSuiteMetadata();

  const problems = validateFixtures(
    fixtures,
    suites.map(({ id }) => id),
    suites.filter(({ coverage }) => coverage).map(({ id }) => id)
  );
  if (problems.length > 0) {
    console.error(`replay_fixtures.json is not ready to gate on:\n- ${problems.join('\n- ')}`);
    return 1;
  }

  if (argv.includes('--check')) {
    console.log(`replay_fixtures.json is valid (${fixtures.length} fixtures). Matcher not run.`);
    return 0;
  }

  if (split !== 'tuning') {
    console.log('Acceptance PRs are judged once, after tuning stops. Do not tune against them.\n');
  }

  const selected = selectFixtures(fixtures, split);
  const skillDirs = listSkillDirs();
  const results: ReplayResult[] = [];
  for (const { pr, kind, expectedSuiteIds } of selected) {
    const changes = await getPrChanges('elastic', 'kibana', pr);
    const { suggestions, overflow } = getEvalSuggestions({
      changes,
      suites,
      labels: [],
      skillDirs,
    });
    const suggestedSuiteIds = [...suggestions, ...overflow].map(({ suiteId }) => suiteId);
    results.push({ pr, suggestedSuiteIds });
    console.log(
      `#${pr} ${kind} expected=[${expectedSuiteIds.join(', ')}] suggested=[${suggestedSuiteIds.join(
        ', '
      )}]`
    );
  }

  const unscored = summarizeUnscored(results, selected);
  if (unscored.length > 0) {
    console.log('\nNeeds new coverage (not scored), with what the matcher suggested:');
    for (const { pr, suggestedSuiteIds } of unscored) {
      console.log(`#${pr} suggested=[${suggestedSuiteIds.join(', ')}]`);
    }
  }

  const score = scoreReplay(results, selected);
  const passed = meetsAcceptanceThresholds(score);
  console.log(`\n${JSON.stringify(score, null, 2)}`);
  console.log(`Thresholds ${JSON.stringify(ACCEPTANCE_THRESHOLDS)}: ${passed ? 'PASS' : 'FAIL'}`);

  return passed ? 0 : 1;
};

if (basename(process.argv[1] ?? '') === 'replay_suggestions.ts') {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error);
      process.exit(1);
    }
  );
}
