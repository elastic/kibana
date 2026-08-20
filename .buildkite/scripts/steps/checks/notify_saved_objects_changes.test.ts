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
  formatFindingForComment,
  type SavedObjectsCheckFinding,
  type SavedObjectsCheckReport,
  type TypeChangeDetails,
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

  it('returns null when testMode is true, even if SO types appear changed (pass)', () => {
    expect(
      buildCommentBody(report({ updatedTypes: ['person-so-type'], testMode: true }))
    ).toBeNull();
  });

  it('returns null when testMode is true, even if the check failed', () => {
    expect(
      buildCommentBody(report({ status: 'fail', findings: [finding()], testMode: true }))
    ).toBeNull();
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

  it('includes the 2-step release reminder when types were updated', () => {
    const body = buildSuccessBody(report({ updatedTypes: ['task'] }));
    expect(body).toMatch(/2-step release/);
    expect(body).toContain('[!CAUTION]');
    expect(body).toContain('https://www.elastic.co/docs/extend/kibana/saved-objects');
  });

  it('includes the 2-step release reminder when types were removed', () => {
    const body = buildSuccessBody(report({ removedTypes: ['old-type'] }));
    expect(body).toMatch(/2-step release/);
  });

  it('omits the 2-step release reminder for pure new-type additions', () => {
    const body = buildSuccessBody(report({ newTypes: ['shiny-new-type'] }));
    expect(body).not.toMatch(/2-step release/);
    expect(body).toContain('**New types:** `shiny-new-type`');
  });

  it('renders a new model version line for updated types', () => {
    const typeChanges: Record<string, TypeChangeDetails> = {
      task: { newModelVersions: ['10.3.0'], modifiedModelVersions: [] },
    };
    const body = buildSuccessBody(report({ updatedTypes: ['task'], typeChanges }));
    expect(body).toContain('A new model version was introduced for type `task`: `10.3.0`.');
  });

  it('renders modified model version lines for updated types', () => {
    const typeChanges: Record<string, TypeChangeDetails> = {
      config: { newModelVersions: [], modifiedModelVersions: ['10.1.0', '10.2.0'] },
    };
    const body = buildSuccessBody(report({ updatedTypes: ['config'], typeChanges }));
    expect(body).toContain(
      'The following model versions have been modified for type `config`: `10.1.0`, `10.2.0`.'
    );
  });

  it('renders both new and modified version lines when both are present', () => {
    const typeChanges: Record<string, TypeChangeDetails> = {
      task: { newModelVersions: ['10.4.0'], modifiedModelVersions: ['10.2.0'] },
    };
    const body = buildSuccessBody(report({ updatedTypes: ['task'], typeChanges }));
    expect(body).toContain('A new model version was introduced for type `task`: `10.4.0`.');
    expect(body).toContain(
      'The following model versions have been modified for type `task`: `10.2.0`.'
    );
  });

  it('omits the change details section when typeChanges is absent', () => {
    const body = buildSuccessBody(report({ updatedTypes: ['task'] }));
    expect(body).not.toContain('model version was introduced');
    expect(body).not.toContain('model versions have been modified');
  });

  it('includes the IMPORTANT mappings banner for new types', () => {
    const body = buildSuccessBody(report({ newTypes: ['shiny-new-type'] }));
    expect(body).toContain('[!IMPORTANT]');
    expect(body).toContain('searchable and/or sortable');
  });

  it('includes the IMPORTANT mappings banner for updated types with a new model version', () => {
    const typeChanges: Record<string, TypeChangeDetails> = {
      task: { newModelVersions: ['10.3.0'], modifiedModelVersions: [] },
    };
    const body = buildSuccessBody(report({ updatedTypes: ['task'], typeChanges }));
    expect(body).toContain('[!IMPORTANT]');
  });

  it('omits the IMPORTANT mappings banner for updated types with only modified model versions', () => {
    const typeChanges: Record<string, TypeChangeDetails> = {
      task: { newModelVersions: [], modifiedModelVersions: ['10.2.0'] },
    };
    const body = buildSuccessBody(report({ updatedTypes: ['task'], typeChanges }));
    expect(body).not.toContain('[!IMPORTANT]');
  });

  it('includes the IMPORTANT mappings banner for updated types when typeChanges is absent (conservative fallback)', () => {
    const body = buildSuccessBody(report({ updatedTypes: ['task'] }));
    expect(body).toContain('[!IMPORTANT]');
  });

  it('includes the WARNING banner when an ancestor baseline snapshot was used', () => {
    const body = buildSuccessBody(
      report({
        updatedTypes: ['search'],
        baseline: 'merge-base-sha',
        baselineSnapshotSha: 'older-sha',
        baselineSnapshotUsedAncestor: true,
      })
    );

    expect(body).toContain('[!WARNING]');
    expect(body).toContain('older than the requested merge-base');
    expect(body).toContain('`merge-base-sha` → `older-sha`');
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

  it('includes the WARNING banner when an ancestor baseline snapshot was used', () => {
    const body = buildFailureBody(
      report({
        status: 'fail',
        baseline: 'merge-base-sha',
        baselineSnapshotSha: 'older-sha',
        baselineSnapshotUsedAncestor: true,
        findings: [finding()],
      })
    );

    expect(body).toContain('[!WARNING]');
    expect(body).toContain('rebase onto the latest `main`');
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

  it('renders fixture mismatch diffs in a diff code block without ANSI codes', () => {
    const body = buildFailureBody(
      report({
        status: 'fail',
        findings: [
          finding({
            ruleId: 'documents/fixture-mismatch',
            typeName: 'search',
            message:
              "A document of type 'search' did NOT match any of the fixtures. Closest match: fixtures['10.13.0'][0] (path/to/fixture.json)\n\u001B[32m- Expected\u001B[39m",
            details: `- Expected - 1
+ Received + 1

  Object {
-   "id": "old",
+   "id": "new",
  }`,
          }),
        ],
      })
    );

    expect(body).toContain('```diff');
    expect(body).toContain('-   "id": "old",');
    expect(body).not.toContain('\u001B[');
    expect(body).not.toContain('[32m');
  });

  it('strips ANSI codes from legacy fixture mismatch messages without details', () => {
    const formatted = formatFindingForComment(
      finding({
        ruleId: 'documents/fixture-mismatch',
        message: `summary line\n\u001B[31m+ Received + 1\u001B[39m\n+   "id": "new",`,
      })
    );

    expect(formatted).toContain('summary line');
    expect(formatted).toContain('```diff');
    expect(formatted).toContain('+   "id": "new",');
    expect(formatted).not.toContain('\u001B[');
  });

  describe('when the run failed but no findings were collected', () => {
    const originalBuildUrl = process.env.BUILDKITE_BUILD_URL;
    afterEach(() => {
      if (originalBuildUrl === undefined) {
        delete process.env.BUILDKITE_BUILD_URL;
      } else {
        process.env.BUILDKITE_BUILD_URL = originalBuildUrl;
      }
    });

    it('renders a fallback body that points to the Buildkite build URL when set', () => {
      process.env.BUILDKITE_BUILD_URL = 'https://buildkite.com/org/pipeline/builds/123';
      const body = buildFailureBody(report({ status: 'fail', findings: [] }));

      expect(body).toContain('Saved Objects CI check failed');
      expect(body).toContain('no structured findings were collected');
      expect(body).toContain('[Buildkite logs](https://buildkite.com/org/pipeline/builds/123)');
      expect(body).not.toMatch(/0 issue\(s\) across 0 type\(s\)/);
    });

    it('falls back to a generic phrasing when BUILDKITE_BUILD_URL is unset', () => {
      delete process.env.BUILDKITE_BUILD_URL;
      const body = buildFailureBody(report({ status: 'fail', findings: [] }));

      expect(body).toContain('See the Buildkite logs for details');
      expect(body).not.toContain('[Buildkite logs](');
    });
  });
});
