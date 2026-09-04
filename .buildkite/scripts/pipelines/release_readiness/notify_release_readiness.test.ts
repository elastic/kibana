/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildSignals,
  commitsMatch,
  composeMessage,
  parseDevCommit,
  parsePromotionMessage,
} from './notify_release_readiness';
import type { DevPromotion, FtrRunInfo, ReadinessInput } from './notify_release_readiness';

const NOW = new Date('2026-08-10T12:00:00Z');

const makePromotion = (overrides: Partial<DevPromotion> = {}): DevPromotion => ({
  promotedSha: '5eaea1e3a76a',
  promotedAt: new Date('2026-08-10T10:00:00Z'),
  url: 'https://github.com/elastic/serverless-gitops/commit/ccb9da32d8',
  ...overrides,
});

const makeFtrRun = (overrides: Partial<FtrRunInfo> = {}): FtrRunInfo => ({
  number: 10346,
  state: 'passed',
  webUrl: 'https://buildkite.com/elastic/appex-qa-serverless-kibana-ftr-tests/builds/10346',
  testedCommit: '5eaea1e3a76a',
  ...overrides,
});

const makeInput = (overrides: Partial<ReadinessInput> = {}): ReadinessInput => ({
  ftrRun: makeFtrRun(),
  devCommit: '5eaea1e3a76a',
  promotion: makePromotion(),
  maxPromotionAgeHours: 6,
  now: NOW,
  ...overrides,
});

describe('parseDevCommit', () => {
  it('extracts the dev commit from the versions file', () => {
    const content = 'services:\n  kibana:\n    versions:\n      dev: "5eaea1e3a76a"\n';
    expect(parseDevCommit(content)).toBe('5eaea1e3a76a');
  });

  it('throws when no dev commit is present', () => {
    expect(() => parseDevCommit('services:\n  kibana:\n    versions:\n')).toThrow(
      'Could not find the dev commit'
    );
  });
});

describe('parsePromotionMessage', () => {
  it('extracts the promoted sha from a dev promotion message', () => {
    expect(
      parsePromotionMessage('gitops: dev Artifact promotion for kibana to 5eaea1e3a76a (#160169)')
    ).toBe('5eaea1e3a76a');
  });

  it('returns null for other promotions', () => {
    expect(
      parsePromotionMessage(
        'gitops: staging Artifact promotion for kibana to 5eaea1e3a76a (#160169)'
      )
    ).toBeNull();
  });
});

describe('commitsMatch', () => {
  it('matches identical short SHAs', () => {
    expect(commitsMatch('5eaea1e3a76a', '5eaea1e3a76a')).toBe(true);
  });

  it('matches a short SHA against the full SHA', () => {
    expect(commitsMatch('5eaea1e3a76a', '5eaea1e3a76a0000000000000000000000000000')).toBe(true);
    expect(commitsMatch('5eaea1e3a76a0000000000000000000000000000', '5eaea1e3a76a')).toBe(true);
  });

  it('does not match different commits', () => {
    expect(commitsMatch('5eaea1e3a76a', 'edbe115717e7')).toBe(false);
  });
});

describe('buildSignals', () => {
  it('passes the FTR signal when the latest run passed on the current dev commit', () => {
    const [ftrSignal] = buildSignals(makeInput());
    expect(ftrSignal.passed).toBe(true);
    expect(ftrSignal.warning).toBeFalsy();
    expect(ftrSignal.description).toContain('on the latest `dev` commit');
  });

  it('passes with a warning when the latest run passed on an older dev commit', () => {
    const [ftrSignal] = buildSignals(makeInput({ devCommit: 'edbe115717e7' }));
    expect(ftrSignal.passed).toBe(true);
    expect(ftrSignal.warning).toBe(true);
    expect(ftrSignal.description).toBe('FTR tests pass on MKI');
    expect(ftrSignal.details).toContain('has not been FTR-tested yet');
  });

  it('fails the FTR signal when the latest run failed', () => {
    const [ftrSignal] = buildSignals(makeInput({ ftrRun: makeFtrRun({ state: 'failed' }) }));
    expect(ftrSignal.passed).toBe(false);
  });

  it('fails the FTR signal when no run was found', () => {
    const [ftrSignal] = buildSignals(makeInput({ ftrRun: null }));
    expect(ftrSignal.passed).toBe(false);
    expect(ftrSignal.details).toContain('no FTR run found');
  });

  it('fails the promotion signal when the promotion is too old', () => {
    const [, promotionSignal] = buildSignals(
      makeInput({ promotion: makePromotion({ promotedAt: new Date('2026-08-10T05:00:00Z') }) })
    );
    expect(promotionSignal.passed).toBe(false);
  });

  it('passes the promotion signal when the promotion is recent', () => {
    const [, promotionSignal] = buildSignals(makeInput());
    expect(promotionSignal.passed).toBe(true);
    expect(promotionSignal.details).toContain('2h 0m ago');
  });
});

describe('composeMessage', () => {
  it('reports ready when all signals pass', () => {
    expect(composeMessage(buildSignals(makeInput()))).toContain(
      'Kibana is currently ready for a MKI release'
    );
  });

  it('reports not ready when a signal fails', () => {
    expect(
      composeMessage(buildSignals(makeInput({ ftrRun: makeFtrRun({ state: 'failed' }) })))
    ).toContain('Kibana is currently *not* ready for a MKI release');
  });

  it('marks stale-but-passing FTR runs with a warning emoji', () => {
    expect(composeMessage(buildSignals(makeInput({ devCommit: 'edbe115717e7' })))).toContain(
      ':warning: FTR tests pass on MKI'
    );
  });
});
