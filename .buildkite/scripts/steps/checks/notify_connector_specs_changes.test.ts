/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('#pipeline-utils', () => ({
  upsertComment: jest.fn(),
  removeComment: jest.fn(),
}));

import {
  buildCommentBody,
  resolveAction,
  type ConnectorReleaseFinding,
  type ConnectorReleaseReport,
} from './notify_connector_specs_changes';

const PNC_A = 'a'.repeat(40);
const PNC_B = 'b'.repeat(40);

const finding = (overrides: Partial<ConnectorReleaseFinding> = {}): ConnectorReleaseFinding => ({
  id: '.new',
  supportedFeatureIds: ['workflows'],
  disallowedFeatureIds: ['workflows'],
  missingFromRefs: [PNC_A],
  message: 'Connector `.new` is not registered in Production-NonCanary…',
  ...overrides,
});

const report = (overrides: Partial<ConnectorReleaseReport> = {}): ConnectorReleaseReport => ({
  status: 'safe',
  applicabilityKnown: true,
  refs: [PNC_A],
  applicableConnectors: [{ id: '.new', supportedFeatureIds: [] }],
  findings: [],
  ...overrides,
});

describe('buildCommentBody', () => {
  it('returns null when this PR changed no connector exposure', () => {
    // A lib, docs, or icon edit inside kbn-connector-specs triggers the step but says nothing.
    expect(buildCommentBody(report({ applicableConnectors: [] }))).toBeNull();
  });

  it('returns null for a package-only change even when the release is inconclusive', () => {
    expect(
      buildCommentBody(
        report({
          status: 'inconclusive',
          reason: 'GITHUB_TOKEN is not set',
          applicableConnectors: [],
        })
      )
    ).toBeNull();
  });

  it('builds the unsafe body with every finding message', () => {
    const body = buildCommentBody(
      report({
        status: 'unsafe',
        findings: [finding(), finding({ id: '.other', message: 'Connector `.other` …' })],
      })
    );

    expect(body).toContain('needs attention');
    expect(body).toContain('2 connector(s)');
    expect(body).toContain('Connector `.other` …');
  });

  it('builds the safe body naming the checked connectors', () => {
    const body = buildCommentBody(report());

    expect(body).toContain('no issues found');
    expect(body).toContain('`.new`');
  });

  it('builds the inconclusive body with the reason and never claims safety', () => {
    const body = buildCommentBody(
      report({ status: 'inconclusive', reason: 'Could not fetch aaaa from origin.' })
    );

    expect(body).toContain('inconclusive');
    expect(body).toContain('Could not fetch aaaa from origin.');
    expect(body).not.toContain('no issues found');
  });

  it('names every inspected Production-NonCanary version', () => {
    const body = buildCommentBody(report({ refs: [PNC_A, PNC_B] }));

    expect(body).toContain(PNC_A.slice(0, 12));
    expect(body).toContain(PNC_B.slice(0, 12));
  });

  it('says so when no versions were inspected', () => {
    const body = buildCommentBody(
      report({ status: 'inconclusive', refs: [], reason: 'no slices' })
    );

    expect(body).toContain('No Production-NonCanary versions were inspected.');
  });

  it('marks every outcome as advisory', () => {
    for (const status of ['safe', 'unsafe', 'inconclusive'] as const) {
      const body = buildCommentBody(
        report({ status, reason: 'r', findings: status === 'unsafe' ? [finding()] : [] })
      );

      expect(body).toContain('advisory');
      expect(body).toContain('does not block the PR');
    }
  });
});

describe('resolveAction', () => {
  it('posts the advisory when a connector exposure changed', () => {
    expect(resolveAction(report({ status: 'unsafe', findings: [finding()] }))).toEqual({
      action: 'post',
      body: expect.stringContaining('needs attention'),
    });
  });

  it('posts the safe outcome so it replaces a stale warning from an earlier run', () => {
    expect(resolveAction(report())).toEqual({
      action: 'post',
      body: expect.stringContaining('no issues found'),
    });
  });

  it('removes an existing advisory once every applicable connector change is reverted', () => {
    // Applicability is computed against the merge base, so a fully reverted connector change
    // leaves nothing applicable and the earlier warning must not outlive it.
    expect(resolveAction(report({ applicableConnectors: [] }))).toEqual({ action: 'remove' });
  });

  it('leaves an existing advisory alone when applicability is unknown', () => {
    expect(resolveAction(report({ applicabilityKnown: false, status: 'inconclusive' }))).toEqual({
      action: 'skip',
    });
  });
});
