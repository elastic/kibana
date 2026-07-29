/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { classifyConnectorRelease } = require('./connector_release_check');

const manifest = (...entries) => ({
  schemaVersion: '1',
  connectors: entries.map(([id, supportedFeatureIds]) => ({ id, supportedFeatureIds })),
});

describe('classifyConnectorRelease', () => {
  it('flags a new connector that declares a disallowed feature', () => {
    const head = manifest(['.new', ['workflows']]);
    const base = manifest();
    const released = manifest();

    const { findings } = classifyConnectorRelease(head, base, released);

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('.new');
    expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
  });

  it('allows a new connector that ships support-only', () => {
    const head = manifest(['.new', []]);
    const { findings } = classifyConnectorRelease(head, manifest(), manifest());
    expect(findings).toEqual([]);
  });

  it('allows a new connector that ships only agentBuilder', () => {
    const head = manifest(['.new', ['agentBuilder']]);
    const { findings } = classifyConnectorRelease(head, manifest(), manifest());
    expect(findings).toEqual([]);
  });

  it('flags the disallowed subset when agentBuilder is mixed with a disallowed feature', () => {
    const head = manifest(['.new', ['agentBuilder', 'workflows']]);
    const { findings } = classifyConnectorRelease(head, manifest(), manifest());
    expect(findings).toHaveLength(1);
    expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
  });

  it('allows any features once the connector is already in the release', () => {
    const head = manifest(['.x', ['workflows', 'cases']]);
    const base = manifest(['.x', []]);
    const released = manifest(['.x', []]);
    const { findings } = classifyConnectorRelease(head, base, released);
    expect(findings).toEqual([]);
  });

  it('ignores a not-yet-released connector this PR did not change', () => {
    // Pre-existing in the branch with features, but untouched by this PR.
    const head = manifest(['.pending', ['workflows']]);
    const base = manifest(['.pending', ['workflows']]);
    const released = manifest();
    const { findings } = classifyConnectorRelease(head, base, released);
    expect(findings).toEqual([]);
  });

  it('flags when this PR adds a disallowed feature to a not-yet-released connector', () => {
    const head = manifest(['.pending', ['agentBuilder', 'workflows']]);
    const base = manifest(['.pending', ['agentBuilder']]);
    const released = manifest();
    const { findings } = classifyConnectorRelease(head, base, released);
    expect(findings).toHaveLength(1);
    expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
  });

  it('fails open (no findings, with a note) when the released manifest is unavailable', () => {
    const head = manifest(['.new', ['workflows']]);
    const result = classifyConnectorRelease(head, manifest(), null);
    expect(result.findings).toEqual([]);
    expect(result.note).toBeDefined();
  });

  it('treats a missing base manifest as empty (connector is new)', () => {
    const head = manifest(['.new', ['workflows']]);
    const { findings } = classifyConnectorRelease(head, null, manifest());
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('.new');
  });
});
