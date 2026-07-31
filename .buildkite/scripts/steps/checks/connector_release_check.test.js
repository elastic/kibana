/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { classifyConnectorRelease } = require('./connector_release_check');

// A connector this PR changed. `existsInRelease` mirrors whether its spec file was
// already present at the serverless release ref.
const changed = (id, supportedFeatureIds, existsInRelease = false) => ({
  id,
  supportedFeatureIds,
  existsInRelease,
});

describe('classifyConnectorRelease', () => {
  it('flags a new connector that declares a disallowed feature', () => {
    const { findings } = classifyConnectorRelease([changed('.new', ['workflows'])], true);

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('.new');
    expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
  });

  it('allows a new connector that ships with no user-facing features', () => {
    const { findings } = classifyConnectorRelease([changed('.new', [])], true);
    expect(findings).toEqual([]);
  });

  it('allows a new connector that ships only agentBuilder', () => {
    const { findings } = classifyConnectorRelease([changed('.new', ['agentBuilder'])], true);
    expect(findings).toEqual([]);
  });

  it('flags the disallowed subset when agentBuilder is mixed with a disallowed feature', () => {
    const { findings } = classifyConnectorRelease(
      [changed('.new', ['agentBuilder', 'workflows'])],
      true
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
  });

  it('allows any features once the connector is already in the release', () => {
    const { findings } = classifyConnectorRelease(
      [changed('.x', ['workflows', 'cases'], true)],
      true
    );
    expect(findings).toEqual([]);
  });

  it('ignores connectors this PR did not change (they are not passed in)', () => {
    // The runner only passes connectors whose spec files changed, so an untouched
    // not-yet-released connector never reaches the classifier.
    const { findings } = classifyConnectorRelease([], true);
    expect(findings).toEqual([]);
  });

  it('flags a not-yet-released connector this PR changed that declares a disallowed feature', () => {
    const { findings } = classifyConnectorRelease(
      [changed('.pending', ['agentBuilder', 'workflows'])],
      true
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
  });

  it('fails open (no findings, with a note) when the released ref is unavailable', () => {
    const result = classifyConnectorRelease([changed('.new', ['workflows'])], false);
    expect(result.findings).toEqual([]);
    expect(result.note).toBeDefined();
  });
});
