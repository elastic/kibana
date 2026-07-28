/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  validateManifest,
  classifyChanges,
  checkReleaseGate,
  runConnectorReleaseGate,
} = require('../../../../.github/scripts/connector_release_gate');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FP_A = 'a'.repeat(64);
const FP_B = 'b'.repeat(64);

const makeManifest = (entries) => ({
  schemaVersion: '1',
  connectors: entries,
});

const entry = (id, features, fp) => ({
  id,
  supportedFeatureIds: features,
  executionFingerprint: fp,
});

// ---------------------------------------------------------------------------
// validateManifest
// ---------------------------------------------------------------------------

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const m = makeManifest([entry('.foo', ['agentBuilder'], FP_A)]);
    expect(validateManifest(m, 'test')).toEqual([]);
  });

  it('accepts a valid support-only connector (empty features)', () => {
    const m = makeManifest([entry('.bar', [], FP_A)]);
    expect(validateManifest(m, 'test')).toEqual([]);
  });

  it('accepts production deployment metadata', () => {
    const m = {
      ...makeManifest([entry('.bar', [], FP_A)]),
      deployedCommit: '1'.repeat(40),
      buildUrl: 'https://buildkite.com/elastic/kibana/builds/1',
    };
    expect(validateManifest(m, 'test')).toEqual([]);
  });

  it('rejects an invalid deployed commit', () => {
    const m = { ...makeManifest([]), deployedCommit: 'not-a-sha' };
    expect(validateManifest(m, 'test')[0]).toMatch(/deployedCommit/);
  });

  it('rejects missing schemaVersion', () => {
    const m = { connectors: [] };
    expect(validateManifest(m, 'test').length).toBeGreaterThan(0);
  });

  it('rejects wrong schemaVersion', () => {
    const m = { schemaVersion: '2', connectors: [] };
    expect(validateManifest(m, 'test')[0]).toMatch(/schemaVersion/);
  });

  it('rejects non-array connectors', () => {
    const m = { schemaVersion: '1', connectors: null };
    expect(validateManifest(m, 'test')[0]).toMatch(/connectors/);
  });

  it('rejects duplicate connector IDs', () => {
    const m = makeManifest([entry('.foo', [], FP_A), entry('.foo', [], FP_B)]);
    expect(validateManifest(m, 'test')[0]).toMatch(/duplicate/);
  });

  it('rejects an invalid fingerprint (too short)', () => {
    const m = makeManifest([{ id: '.foo', supportedFeatureIds: [], executionFingerprint: 'abc' }]);
    expect(validateManifest(m, 'test')[0]).toMatch(/fingerprint/i);
  });

  it('rejects an invalid fingerprint (uppercase)', () => {
    const m = makeManifest([
      { id: '.foo', supportedFeatureIds: [], executionFingerprint: 'A'.repeat(64) },
    ]);
    expect(validateManifest(m, 'test')[0]).toMatch(/fingerprint/i);
  });

  it('rejects a connector with missing supportedFeatureIds', () => {
    const m = makeManifest([{ id: '.foo', executionFingerprint: FP_A }]);
    expect(validateManifest(m, 'test')[0]).toMatch(/supportedFeatureIds/);
  });

  it('rejects a connector with non-string supportedFeatureIds entries', () => {
    const m = makeManifest([{ id: '.foo', supportedFeatureIds: [42], executionFingerprint: FP_A }]);
    expect(validateManifest(m, 'test')[0]).toMatch(/strings/);
  });
});

// ---------------------------------------------------------------------------
// classifyChanges
// ---------------------------------------------------------------------------

describe('classifyChanges', () => {
  it('new connector in head only', () => {
    const [change] = classifyChanges(makeManifest([]), makeManifest([entry('.new', [], FP_A)]));
    expect(change).toMatchObject({ id: '.new', kind: 'new' });
  });

  it('removed connector in base only', () => {
    const [change] = classifyChanges(makeManifest([entry('.old', [], FP_A)]), makeManifest([]));
    expect(change).toMatchObject({ id: '.old', kind: 'removed' });
  });

  it('unchanged connector', () => {
    const e = entry('.x', ['agentBuilder'], FP_A);
    const [change] = classifyChanges(makeManifest([e]), makeManifest([e]));
    expect(change.kind).toBe('unchanged');
  });

  it('fingerprint-only change', () => {
    const [change] = classifyChanges(
      makeManifest([entry('.x', ['workflows'], FP_A)]),
      makeManifest([entry('.x', ['workflows'], FP_B)])
    );
    expect(change.kind).toBe('fingerprint_changed');
  });

  it('features-only change', () => {
    const [change] = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_A)])
    );
    expect(change.kind).toBe('features_only');
  });

  it('fingerprint + features changed', () => {
    const [change] = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_B)])
    );
    expect(change.kind).toBe('fingerprint_and_features_changed');
  });
});

// ---------------------------------------------------------------------------
// checkReleaseGate — gate policy
// ---------------------------------------------------------------------------

describe('checkReleaseGate', () => {
  const emptyProd = makeManifest([]);

  // --- new connector ---

  it('new [] → pass', () => {
    const changes = classifyChanges(makeManifest([]), makeManifest([entry('.new', [], FP_A)]));
    expect(checkReleaseGate(changes, emptyProd).pass).toBe(true);
  });

  it("new ['agentBuilder'] → fail", () => {
    const changes = classifyChanges(
      makeManifest([]),
      makeManifest([entry('.new', ['agentBuilder'], FP_A)])
    );
    const { pass, violations } = checkReleaseGate(changes, emptyProd);
    expect(pass).toBe(false);
    expect(violations[0].connectorId).toBe('.new');
    expect(violations[0].reason).toMatch(/support-only/);
  });

  it("new ['workflows'] → fail", () => {
    const changes = classifyChanges(
      makeManifest([]),
      makeManifest([entry('.new', ['workflows'], FP_A)])
    );
    expect(checkReleaseGate(changes, emptyProd).pass).toBe(false);
  });

  it("new ['alerting'] → fail", () => {
    const changes = classifyChanges(
      makeManifest([]),
      makeManifest([entry('.new', ['alerting'], FP_A)])
    );
    expect(checkReleaseGate(changes, emptyProd).pass).toBe(false);
  });

  // --- base [] → head ['agentBuilder'] ---

  it("base [] → head ['agentBuilder'], production null → fail", () => {
    const changes = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_A)])
    );
    expect(checkReleaseGate(changes, null).pass).toBe(false);
    expect(checkReleaseGate(changes, null).violations[0].reason).toMatch(/Could not load/);
  });

  it("base [] → head ['agentBuilder'], production missing connector → fail", () => {
    const changes = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_A)])
    );
    expect(checkReleaseGate(changes, emptyProd).pass).toBe(false);
    expect(checkReleaseGate(changes, emptyProd).violations[0].reason).toMatch(/not present/);
  });

  it("base [] → head ['agentBuilder'], production fingerprint mismatch → fail", () => {
    const prod = makeManifest([entry('.x', [], FP_B)]);
    const changes = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_A)])
    );
    expect(checkReleaseGate(changes, prod).pass).toBe(false);
    expect(checkReleaseGate(changes, prod).violations[0].reason).toMatch(/fingerprint/i);
  });

  it("base [] → head ['agentBuilder'], production fingerprint matches → pass", () => {
    const prod = makeManifest([entry('.x', [], FP_A)]);
    const changes = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_A)])
    );
    expect(checkReleaseGate(changes, prod).pass).toBe(true);
  });

  // --- base [] → head ['workflows'] ---

  it("base [] → head ['workflows'], production fingerprint matches → pass", () => {
    const prod = makeManifest([entry('.x', [], FP_A)]);
    const changes = classifyChanges(
      makeManifest([entry('.x', [], FP_A)]),
      makeManifest([entry('.x', ['workflows'], FP_A)])
    );
    expect(checkReleaseGate(changes, prod).pass).toBe(true);
  });

  // --- intermediate step: feature removal ---

  it("base ['workflows'] FP_A → head [] FP_B → pass (intermediate step)", () => {
    const changes = classifyChanges(
      makeManifest([entry('.x', ['workflows'], FP_A)]),
      makeManifest([entry('.x', [], FP_B)])
    );
    expect(checkReleaseGate(changes, null).pass).toBe(true);
  });

  it("base [] FP_B → head ['workflows'] FP_B → pass only with matching production", () => {
    const prod = makeManifest([entry('.x', [], FP_B)]);
    const noProd = makeManifest([]);
    const changes = classifyChanges(
      makeManifest([entry('.x', [], FP_B)]),
      makeManifest([entry('.x', ['workflows'], FP_B)])
    );
    expect(checkReleaseGate(changes, prod).pass).toBe(true);
    expect(checkReleaseGate(changes, noProd).pass).toBe(false);
  });

  // --- fingerprint change with existing features ---

  it("base ['agentBuilder'] FP_A → head ['agentBuilder'] FP_B → fail without prod FP_B", () => {
    const prod = makeManifest([entry('.x', ['agentBuilder'], FP_A)]);
    const changes = classifyChanges(
      makeManifest([entry('.x', ['agentBuilder'], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_B)])
    );
    expect(checkReleaseGate(changes, prod).pass).toBe(false);
  });

  it("base ['agentBuilder'] FP_A → head ['agentBuilder'] FP_B → pass with prod FP_B", () => {
    const prod = makeManifest([entry('.x', ['agentBuilder'], FP_B)]);
    const changes = classifyChanges(
      makeManifest([entry('.x', ['agentBuilder'], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_B)])
    );
    expect(checkReleaseGate(changes, prod).pass).toBe(true);
  });

  // --- rename (treated as removed + new) ---

  it('rename old → new with [] → pass as new support-only', () => {
    const changes = classifyChanges(
      makeManifest([entry('.old', ['workflows'], FP_A)]),
      makeManifest([entry('.new', [], FP_A)])
    );
    expect(checkReleaseGate(changes, null).pass).toBe(true);
  });

  it('rename old → new with any feature → fail', () => {
    const changes = classifyChanges(
      makeManifest([entry('.old', ['workflows'], FP_A)]),
      makeManifest([entry('.new', ['agentBuilder'], FP_A)])
    );
    expect(checkReleaseGate(changes, null).pass).toBe(false);
  });

  // --- feature removal and unchanged ---

  it('feature removal only → pass', () => {
    const changes = classifyChanges(
      makeManifest([entry('.x', ['agentBuilder', 'workflows'], FP_A)]),
      makeManifest([entry('.x', ['agentBuilder'], FP_A)])
    );
    expect(checkReleaseGate(changes, null).pass).toBe(true);
  });

  it('unchanged connector → pass', () => {
    const e = entry('.x', ['workflows'], FP_A);
    const changes = classifyChanges(makeManifest([e]), makeManifest([e]));
    expect(checkReleaseGate(changes, null).pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runConnectorReleaseGate — integration (manifest validation in context)
// ---------------------------------------------------------------------------

const makeGithub = ({ baseContent = null, headContent = null, prodContent = null } = {}) => ({
  rest: {
    repos: {
      getContent: jest.fn(({ ref }) => {
        const pick = () => {
          if (ref === 'base-sha') return baseContent;
          if (ref === 'head-sha') return headContent;
          if (ref === 'refs/heads/connector-production-manifest') return prodContent;
          return null;
        };
        const content = pick();
        if (content === null) {
          const err = new Error('not found');
          err.status = 404;
          throw err;
        }
        return {
          data: {
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(content).toString('base64'),
          },
        };
      }),
    },
  },
});

const makeContext = () => ({
  repo: { owner: 'elastic', repo: 'kibana' },
  payload: {
    pull_request: { base: { sha: 'base-sha' }, head: { sha: 'head-sha' } },
  },
});

const makeCore = () => ({
  info: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn(),
});

const validManifest = (entries = []) => JSON.stringify({ schemaVersion: '1', connectors: entries });

describe('runConnectorReleaseGate', () => {
  let core;
  beforeEach(() => {
    core = makeCore();
  });

  it('calls setFailed for a head manifest with duplicate connector IDs', async () => {
    const head = JSON.stringify({
      schemaVersion: '1',
      connectors: [entry('.foo', [], FP_A), entry('.foo', [], FP_B)],
    });
    const github = makeGithub({ headContent: head });
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/malformed|duplicate/i));
  });

  it('calls setFailed for a head manifest with wrong schemaVersion', async () => {
    const head = JSON.stringify({ schemaVersion: '2', connectors: [] });
    const github = makeGithub({ headContent: head });
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/schemaVersion/i));
  });

  it('calls setFailed for a head manifest with an invalid fingerprint', async () => {
    const head = JSON.stringify({
      schemaVersion: '1',
      connectors: [{ id: '.foo', supportedFeatureIds: [], executionFingerprint: 'tooshort' }],
    });
    const github = makeGithub({ headContent: head });
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/fingerprint/i));
  });

  it('calls setFailed for a head manifest with missing supportedFeatureIds', async () => {
    const head = JSON.stringify({
      schemaVersion: '1',
      connectors: [{ id: '.foo', executionFingerprint: FP_A }],
    });
    const github = makeGithub({ headContent: head });
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/supportedFeatureIds/i));
  });

  it('calls setFailed for a malformed production manifest', async () => {
    // head has new support-only connector — relevant change; prod will be checked if features added
    // Let's add a feature so prod is loaded
    const headWithFeature = validManifest([entry('.foo', ['agentBuilder'], FP_A)]);
    // base has .foo at FP_A with no features, head has features (triggers prod check)
    const baseWithSupportOnly = validManifest([entry('.foo', [], FP_A)]);
    const prod = JSON.stringify({ schemaVersion: '2', connectors: [] }); // invalid schemaVersion
    const github = makeGithub({
      baseContent: baseWithSupportOnly,
      headContent: headWithFeature,
      prodContent: prod,
    });
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringMatching(/production.*malformed|schemaVersion/i)
    );
  });

  it('passes a new support-only connector with no production', async () => {
    const github = makeGithub({
      headContent: validManifest([entry('.new', [], FP_A)]),
    });
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('does nothing when both base and head are absent', async () => {
    const github = makeGithub();
    await runConnectorReleaseGate({ github, context: makeContext(), core });
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(expect.stringMatching(/not present/));
  });
});
