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
}));

import {
  buildCommentBody,
  buildFailureBody,
  buildSuccessBody,
  type SavedObjectsCheckFinding,
  type SavedObjectsCheckReport,
} from './notify_saved_objects_changes';

const finding = (overrides: Partial<SavedObjectsCheckFinding> = {}): SavedObjectsCheckFinding => ({
  ruleId: 'existing-type/mutated-existing-model-version',
  severity: 'error',
  typeName: 'task',
  message: "Some modelVersions have been updated for SO type 'task'.",
  fixHint: 'Existing model versions are immutable.',
  docsAnchor: '#defining-model-versions',
  ...overrides,
});

const report = (overrides: Partial<SavedObjectsCheckReport> = {}): SavedObjectsCheckReport => ({
  status: 'pass',
  baseline: 'abc123',
  newTypes: [],
  updatedTypes: [],
  removedTypes: [],
  findings: [],
  ...overrides,
});

describe('buildCommentBody', () => {
  it('returns null on a clean pass with no SO changes', () => {
    expect(buildCommentBody(report())).toBeNull();
  });

  it('returns the success body when the run passed and SO types were touched', () => {
    const body = buildCommentBody(report({ updatedTypes: ['task'] }));
    expect(body).not.toBeNull();
    expect(body).toContain('Saved Objects CI check passed');
  });

  it('returns the failure body when the run failed', () => {
    const body = buildCommentBody(report({ status: 'fail', findings: [finding()] }));
    expect(body).toContain('Saved Objects CI check failed');
  });
});

describe('buildSuccessBody', () => {
  it('lists every change category that has entries', () => {
    const body = buildSuccessBody(
      report({
        newTypes: ['shiny-new-type'],
        updatedTypes: ['task', 'config'],
        removedTypes: ['old-type'],
      })
    );

    expect(body).toContain('**New types:** `shiny-new-type`');
    expect(body).toContain('**Updated types:** `task`, `config`');
    expect(body).toContain('**Removed types:** `old-type`');
  });

  it('includes the 2-step release reminder with a docs link', () => {
    const body = buildSuccessBody(report({ updatedTypes: ['task'] }));
    expect(body).toMatch(/2-step release/);
    expect(body).toContain('https://www.elastic.co/docs/extend/kibana/saved-objects');
  });
});

describe('buildFailureBody', () => {
  it('groups findings by typeName and emits per-rule bullets with a docs link', () => {
    const body = buildFailureBody(
      report({
        status: 'fail',
        findings: [
          finding({ typeName: 'task', ruleId: 'existing-type/mutated-existing-model-version' }),
          finding({
            typeName: 'task',
            ruleId: 'existing-type/mappings-changed-without-new-model-version',
            message: 'mappings changed without a new model version',
            fixHint: 'add a model version',
          }),
          finding({
            typeName: 'config',
            ruleId: 'new-type/legacy-migrations',
            message: "New SO type 'config' cannot define legacy migrations",
            fixHint: 'remove migrations',
          }),
        ],
      })
    );

    expect(body).toContain('### `task`');
    expect(body).toContain('### `config`');
    expect(body).toContain('**[existing-type/mutated-existing-model-version]**');
    expect(body).toContain('**[new-type/legacy-migrations]**');
    expect(body).toContain(
      '([docs](https://www.elastic.co/docs/extend/kibana/saved-objects#defining-model-versions))'
    );
    expect(body).toMatch(/3 issue\(s\) across 2 type\(s\)/);
  });

  it('files findings without a typeName under a General section', () => {
    const body = buildFailureBody(
      report({
        status: 'fail',
        findings: [
          finding({ typeName: undefined, ruleId: 'generic', message: 'something blew up' }),
        ],
      })
    );

    expect(body).toContain('### General');
    expect(body).toContain('**[generic]** something blew up');
  });

  it('embeds a reproducible local command using the baseline SHA', () => {
    const body = buildFailureBody(
      report({ status: 'fail', baseline: 'deadbeef', findings: [finding()] })
    );

    expect(body).toContain('node scripts/check_saved_objects --baseline deadbeef');
  });

  it('falls back to a placeholder when no baseline is available', () => {
    const body = buildFailureBody(
      report({ status: 'fail', baseline: undefined, findings: [finding()] })
    );

    expect(body).toContain('node scripts/check_saved_objects --baseline <merge-base-sha>');
  });

  it('omits the fix hint when not provided', () => {
    const body = buildFailureBody(
      report({
        status: 'fail',
        findings: [finding({ fixHint: undefined })],
      })
    );

    expect(body).not.toContain('_Fix:_');
  });
});
