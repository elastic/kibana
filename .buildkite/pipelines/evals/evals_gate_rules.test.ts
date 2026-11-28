/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EvalsDecisionSuite, EvalsVerdict, VerdictLookup } from './evals_gate_rules.ts';
import {
  combineDecisions,
  decideSuite,
  findReusableVerdict,
  formatReusedVerdictDescription,
  getDecisionPathMatches,
  requestsModelsBeyondDefaults,
  isReusedVerdict,
  isSuiteSkipped,
  truncateDescription,
} from './evals_gate_rules.ts';

const HEAD = 'ffffffffffffffffffffffffffffffffffffffff';

const DECISION_SUITE: EvalsDecisionSuite = {
  id: 'agent',
  ciLabels: ['evals:agent'],
  requireDecisionOnPaths: {
    include: ['plugins/agent/server/**'],
    exclude: ['**/*.test.ts'],
  },
};

const GATED_SUITE: EvalsDecisionSuite = {
  ...DECISION_SUITE,
  id: 'gated',
  ciLabels: ['evals:gated'],
  regressionGate: {
    dataset: 'golden',
    evaluator: 'goal_pass',
    minAbsoluteDrop: 0.1,
    alpha: 0.05,
    maxBaselineAgeDays: 3,
  },
};

const verdict = (state: EvalsVerdict['state'], sha = HEAD): EvalsVerdict => ({
  state,
  sha,
  description:
    state === 'failure' ? 'goal_pass 0.55 → 0.32 (p=0.001)' : 'no regression in goal_pass',
});

describe('getDecisionPathMatches', () => {
  it('matches include globs, drops excluded files, and sorts and de-duplicates', () => {
    expect(
      getDecisionPathMatches(
        [
          'plugins/agent/server/tools/b.ts',
          'plugins/agent/server/prompt.md.text',
          'plugins/agent/server/tools/b.ts',
          'plugins/agent/server/tools/b.test.ts',
          'plugins/agent/public/app.tsx',
        ],
        DECISION_SUITE
      )
    ).toEqual(['plugins/agent/server/prompt.md.text', 'plugins/agent/server/tools/b.ts']);
  });

  it('matches nothing for a suite that has not opted in', () => {
    expect(getDecisionPathMatches(['plugins/agent/server/a.ts'], { id: 'other' })).toEqual([]);
  });
});

describe('requestsModelsBeyondDefaults', () => {
  const suite = { defaultModelGroups: ['eis/anthropic-claude-5.5-sonnet'] };

  it('counts a model label for a model the suite does not run by default', () => {
    expect(requestsModelsBeyondDefaults(['models:eis/openai-gpt-5.4'], suite)).toBe(true);
    expect(requestsModelsBeyondDefaults(['models:weekly-eis-models'], suite)).toBe(true);
  });

  it('ignores the default model, the judge label, and PRs without model labels', () => {
    expect(requestsModelsBeyondDefaults(['models:eis/anthropic-claude-5.5-sonnet'], suite)).toBe(
      false
    );
    expect(requestsModelsBeyondDefaults(['models:judge:eis/openai-gpt-5.4'], suite)).toBe(false);
    expect(requestsModelsBeyondDefaults(['evals:gated'], suite)).toBe(false);
  });
});

describe('isSuiteSkipped', () => {
  it('applies the generic skip only to suites that require a decision', () => {
    expect(isSuiteSkipped(['evals:skip'], DECISION_SUITE)).toBe(true);
    expect(isSuiteSkipped(['evals:skip'], { id: 'smoke-tests' })).toBe(false);
  });

  it('honours the per-suite skip for any suite', () => {
    expect(isSuiteSkipped(['evals:skip-smoke-tests'], { id: 'smoke-tests' })).toBe(true);
  });
});

describe('decideSuite', () => {
  const decide = (suite: EvalsDecisionSuite, labels: string[], v?: EvalsVerdict) =>
    decideSuite({ suite, labels, verdict: v, headSha: HEAD });

  it('requires a decision when neither a run nor a skip label is present', () => {
    expect(decide(DECISION_SUITE, [])).toEqual({
      suiteId: 'agent',
      kind: 'missing',
      state: 'failure',
      description: 'Evals decision required: add evals:agent or evals:skip',
      runLabel: 'evals:agent',
    });
  });

  it('lets a skip win over a run label', () => {
    expect(decide(GATED_SUITE, ['evals:skip', 'evals:gated'])).toMatchObject({
      kind: 'skipped',
      state: 'success',
    });
    expect(decide(GATED_SUITE, ['evals:skip'], verdict('failure', 'abcdef0123'))).toMatchObject({
      kind: 'skipped',
    });
  });

  it('keeps a regression on the head commit blocking after a skip or a dropped run label', () => {
    expect(decide(GATED_SUITE, ['evals:skip', 'evals:gated'], verdict('failure'))).toMatchObject({
      kind: 'regression',
      state: 'failure',
    });
    expect(decide(GATED_SUITE, [], verdict('failure'))).toMatchObject({ kind: 'regression' });
    expect(
      decide(GATED_SUITE, ['evals:skip', 'evals:accept-regression'], verdict('failure'))
    ).toMatchObject({ kind: 'accepted', state: 'success' });
  });

  it('passes on a run label alone for a suite without a regression gate', () => {
    expect(decide(DECISION_SUITE, ['evals:agent'])).toMatchObject({ state: 'success' });
    expect(decide(DECISION_SUITE, ['evals:all'])).toMatchObject({ state: 'success' });
  });

  it('waits for a verdict on a gated suite', () => {
    expect(decide(GATED_SUITE, ['evals:gated'])).toMatchObject({ state: 'pending' });
    expect(decide(GATED_SUITE, ['evals:gated'], verdict('pending'))).toMatchObject({
      state: 'pending',
    });
  });

  it('stops waiting once the eval build finished without a verdict', () => {
    expect(
      decideSuite({
        suite: GATED_SUITE,
        labels: ['evals:gated'],
        verdict: undefined,
        headSha: HEAD,
        evalsBuildFinished: true,
      })
    ).toMatchObject({
      kind: 'inconclusive',
      state: 'success',
      description: 'gated inconclusive, not enforced: the eval build finished without a verdict',
    });
  });

  it('passes on a successful verdict and names a reused one', () => {
    expect(decide(GATED_SUITE, ['evals:gated'], verdict('success'))).toMatchObject({
      state: 'success',
      description: 'gated: no regression in goal_pass',
    });
    expect(
      decide(GATED_SUITE, ['evals:gated'], verdict('success', 'abcdef0123456789'))
    ).toMatchObject({ description: 'gated: no regression in goal_pass (from abcdef0)' });
  });

  it('never blocks on an inconclusive verdict', () => {
    expect(decide(GATED_SUITE, ['evals:gated'], verdict('error'))).toMatchObject({
      kind: 'inconclusive',
      state: 'success',
    });
  });

  it('blocks on a regression unless it is accepted', () => {
    expect(decide(GATED_SUITE, ['evals:gated'], verdict('failure'))).toEqual({
      suiteId: 'gated',
      kind: 'regression',
      state: 'failure',
      description:
        'gated regressed: goal_pass 0.55 → 0.32 (p=0.001). Fix or add evals:accept-regression',
    });
    expect(
      decide(GATED_SUITE, ['evals:gated', 'evals:accept-regression'], verdict('failure'))
    ).toMatchObject({ kind: 'accepted', state: 'success' });
  });
});

describe('combineDecisions', () => {
  it('reports that no decision is required when no suite matched', () => {
    expect(combineDecisions([])).toEqual({
      state: 'success',
      description: 'No evals decision required for these changes',
    });
  });

  it('merges missing decisions into one sentence and lets failures win', () => {
    expect(
      combineDecisions([
        { suiteId: 'a', kind: 'missing', state: 'failure', description: 'x' },
        { suiteId: 'b', kind: 'missing', state: 'failure', description: 'y' },
        { suiteId: 'c', kind: 'pending', state: 'pending', description: 'z' },
      ])
    ).toEqual({
      state: 'failure',
      description: 'Evals decision required: add evals:a, evals:b or evals:skip',
    });
  });

  it("names each suite's own run label when several need a decision", () => {
    const customLabelSuite: EvalsDecisionSuite = {
      ...DECISION_SUITE,
      id: 'agent',
      ciLabels: ['evals:agent-v2'],
    };
    expect(
      combineDecisions([
        decideSuite({ suite: customLabelSuite, labels: [], verdict: undefined, headSha: HEAD }),
        decideSuite({ suite: GATED_SUITE, labels: [], verdict: undefined, headSha: HEAD }),
      ]).description
    ).toBe('Evals decision required: add evals:agent-v2, evals:gated or evals:skip');
  });

  it('reports pending over success', () => {
    expect(
      combineDecisions([
        { suiteId: 'a', kind: 'skipped', state: 'success', description: 'Evals skipped: a' },
        { suiteId: 'b', kind: 'pending', state: 'pending', description: 'Waiting for b' },
      ])
    ).toEqual({ state: 'pending', description: 'Waiting for b' });
  });

  it('groups skipped suites', () => {
    expect(
      combineDecisions([
        { suiteId: 'a', kind: 'skipped', state: 'success', description: '' },
        { suiteId: 'b', kind: 'skipped', state: 'success', description: '' },
      ]).description
    ).toBe('Evals skipped: a, b');
  });
});

describe('truncateDescription', () => {
  it('keeps descriptions within the GitHub limit', () => {
    const truncated = truncateDescription('x'.repeat(200));
    expect(truncated).toHaveLength(140);
    expect(truncated.endsWith('…')).toBe(true);
  });
});

describe('formatReusedVerdictDescription', () => {
  it('marks the source commit, keeping the marker when the description is truncated', () => {
    const marked = formatReusedVerdictDescription('x'.repeat(200), 'abcdef0123456789');
    expect(marked).toHaveLength(140);
    expect(marked.endsWith(' (from abcdef0)')).toBe(true);
    expect(isReusedVerdict({ state: 'success', sha: HEAD, description: marked })).toBe(true);
    expect(isReusedVerdict(verdict('success'))).toBe(false);
  });
});

describe('findReusableVerdict', () => {
  const createLookup = ({
    shas,
    verdicts,
    files,
  }: {
    shas: string[];
    verdicts: Record<string, EvalsVerdict['state']>;
    files: Record<string, string[] | undefined>;
  }): VerdictLookup => ({
    listPullRequestCommitShas: async () => shas,
    getVerdict: async (sha) => (verdicts[sha] ? verdict(verdicts[sha], sha) : undefined),
    listFilesBetween: async (base) => files[base],
  });

  it('reuses the newest pass when no decision paths changed since', async () => {
    const lookup = createLookup({
      shas: ['a', 'b', 'c', HEAD],
      verdicts: { a: 'failure', b: 'success', c: 'error' },
      files: { b: ['plugins/agent/server/a.test.ts', 'docs/readme.md'] },
    });

    await expect(
      findReusableVerdict({ lookup, headSha: HEAD, suite: GATED_SUITE })
    ).resolves.toEqual(verdict('success', 'b'));
  });

  it("never reuses a verdict when the PR's commit list doesn't contain the head", async () => {
    const lookup = createLookup({
      shas: ['a', 'b'],
      verdicts: { b: 'success' },
      files: { b: [] },
    });

    await expect(
      findReusableVerdict({ lookup, headSha: HEAD, suite: GATED_SUITE })
    ).resolves.toBeUndefined();
  });

  it('never reuses a regression, nor an older pass behind it', async () => {
    const lookup = createLookup({
      shas: ['a', 'b', HEAD],
      verdicts: { a: 'success', b: 'failure' },
      files: { a: [], b: [] },
    });

    await expect(
      findReusableVerdict({ lookup, headSha: HEAD, suite: GATED_SUITE })
    ).resolves.toBeUndefined();
  });

  it('never reuses a pass over a regression measured on the head', async () => {
    const lookup = createLookup({
      shas: ['a', HEAD],
      verdicts: { a: 'success', [HEAD]: 'failure' },
      files: { a: [] },
    });

    await expect(
      findReusableVerdict({ lookup, headSha: HEAD, suite: GATED_SUITE })
    ).resolves.toBeUndefined();
  });

  it('skips copied passes, so a regression measured behind one still stops the search', async () => {
    const copied: EvalsVerdict = {
      state: 'success',
      sha: 'c',
      description: formatReusedVerdictDescription('no regression in goal_pass', 'aaaaaaa1'),
    };
    const verdicts: Record<string, EvalsVerdict> = {
      a: verdict('success', 'a'),
      b: verdict('failure', 'b'),
      c: copied,
    };
    const lookup: VerdictLookup = {
      listPullRequestCommitShas: async () => ['a', 'b', 'c', HEAD],
      getVerdict: async (sha) => verdicts[sha],
      listFilesBetween: async () => [],
    };

    await expect(
      findReusableVerdict({ lookup, headSha: HEAD, suite: GATED_SUITE })
    ).resolves.toBeUndefined();
  });

  it('does not reuse a verdict when a decision path changed since', async () => {
    const lookup = createLookup({
      shas: ['a', HEAD],
      verdicts: { a: 'success' },
      files: { a: ['plugins/agent/server/prompt.md.text'] },
    });

    await expect(
      findReusableVerdict({ lookup, headSha: HEAD, suite: GATED_SUITE })
    ).resolves.toBeUndefined();
  });

  it('never reuses an inconclusive verdict or an incomplete file list', async () => {
    await expect(
      findReusableVerdict({
        lookup: createLookup({ shas: ['a', HEAD], verdicts: { a: 'error' }, files: { a: [] } }),
        headSha: HEAD,
        suite: GATED_SUITE,
      })
    ).resolves.toBeUndefined();
    await expect(
      findReusableVerdict({
        lookup: createLookup({
          shas: ['a', HEAD],
          verdicts: { a: 'success' },
          files: { a: undefined },
        }),
        headSha: HEAD,
        suite: GATED_SUITE,
      })
    ).resolves.toBeUndefined();
  });
});
