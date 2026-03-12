/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { baseProposalId, changeFingerprint, computeChanges } from './attachment_bridge';
import { modifyWorkflowProperty } from '../../../server/agent_builder/tools/yaml_edit_utils';

describe('changeFingerprint', () => {
  it('produces consistent fingerprint for same type and newText', () => {
    const fp1 = changeFingerprint({
      proposalId: 'p1',
      type: 'replace',
      startLine: 3,
      endLine: 3,
      newText: 'description: updated\n',
    });
    const fp2 = changeFingerprint({
      proposalId: 'p2',
      type: 'replace',
      startLine: 10,
      endLine: 10,
      newText: 'description: updated\n',
    });
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different types', () => {
    const fpInsert = changeFingerprint({
      proposalId: 'p1',
      type: 'insert',
      startLine: 3,
      newText: 'new line\n',
    });
    const fpReplace = changeFingerprint({
      proposalId: 'p1',
      type: 'replace',
      startLine: 3,
      endLine: 3,
      newText: 'new line\n',
    });
    expect(fpInsert).not.toBe(fpReplace);
  });

  it('produces different fingerprints for different newText', () => {
    const fp1 = changeFingerprint({
      proposalId: 'p1',
      type: 'replace',
      startLine: 3,
      endLine: 3,
      newText: 'description: foo\n',
    });
    const fp2 = changeFingerprint({
      proposalId: 'p1',
      type: 'replace',
      startLine: 3,
      endLine: 3,
      newText: 'name: foo\n',
    });
    expect(fp1).not.toBe(fp2);
  });

  it('is independent of proposalId and line numbers', () => {
    const fp1 = changeFingerprint({
      proposalId: 'abc',
      type: 'insert',
      startLine: 1,
      newText: 'content\n',
    });
    const fp2 = changeFingerprint({
      proposalId: 'xyz',
      type: 'insert',
      startLine: 99,
      newText: 'content\n',
    });
    expect(fp1).toBe(fp2);
  });
});

describe('baseProposalId', () => {
  it('strips the hunk suffix from a suffixed ID', () => {
    expect(baseProposalId('change-timezone::0')).toBe('change-timezone');
    expect(baseProposalId('change-timezone::1')).toBe('change-timezone');
    expect(baseProposalId('my-proposal::42')).toBe('my-proposal');
  });

  it('returns the original ID when there is no suffix', () => {
    expect(baseProposalId('change-timezone')).toBe('change-timezone');
    expect(baseProposalId('simple-id')).toBe('simple-id');
  });

  it('handles empty string', () => {
    expect(baseProposalId('')).toBe('');
  });
});

describe('declined fingerprint filtering', () => {
  it('declined hunk fingerprint matches same hunk in subsequent diff', () => {
    const original = 'name: test\ndescription: old\nsteps:\n  - name: s1\n    type: console\n';
    const withDescChange =
      'name: test\ndescription: new\nsteps:\n  - name: s1\n    type: console\n';

    const declinedHunks = computeChanges(original, withDescChange, 'declined-p');
    expect(declinedHunks).toHaveLength(1);

    const declinedFps = new Set(declinedHunks.map(changeFingerprint));

    const laterHunks = computeChanges(original, withDescChange, 'new-p');
    const surviving = laterHunks.filter((h) => !declinedFps.has(changeFingerprint(h)));
    expect(surviving).toHaveLength(0);
  });

  it('declined fingerprint does not filter unrelated hunks', () => {
    const original = 'name: test\ndescription: old\nsteps:\n  - name: s1\n    type: console\n';
    const withDescChange =
      'name: test\ndescription: new\nsteps:\n  - name: s1\n    type: console\n';
    const withStepChange =
      'name: test\ndescription: old\nsteps:\n  - name: s1\n    type: webhook\n';

    const declinedHunks = computeChanges(original, withDescChange, 'declined-p');
    const declinedFps = new Set(declinedHunks.map(changeFingerprint));

    const newHunks = computeChanges(original, withStepChange, 'new-p');
    const surviving = newHunks.filter((h) => !declinedFps.has(changeFingerprint(h)));
    expect(surviving).toHaveLength(1);
    expect(surviving[0].newText).toContain('webhook');
  });

  it('filters only matching hunks when diff has both declined and new changes', () => {
    const original = 'name: test\ndescription: old\nsteps:\n  - name: s1\n    type: console\n';
    const withDescChange =
      'name: test\ndescription: new\nsteps:\n  - name: s1\n    type: console\n';
    const withBoth = 'name: test\ndescription: new\nsteps:\n  - name: s1\n    type: webhook\n';

    const declinedHunks = computeChanges(original, withDescChange, 'declined-p');
    const declinedFps = new Set(declinedHunks.map(changeFingerprint));

    const allHunks = computeChanges(original, withBoth, 'new-p');
    expect(allHunks).toHaveLength(2);

    const surviving = allHunks.filter((h) => !declinedFps.has(changeFingerprint(h)));
    expect(surviving).toHaveLength(1);
    expect(surviving[0].newText).toContain('webhook');
  });
});

describe('computeChanges', () => {
  it('produces a minimal diff when editor content lacks trailing newline but afterYaml has one', () => {
    const editorContent = [
      "version: '1'",
      'name: Open PRs Report',
      'description: Old description.',
      '',
      'enabled: true',
      'tags:',
      '  - github',
      '',
      'steps:',
      '  - name: step1',
      '    type: console',
      '    with:',
      '      message: hello',
    ].join('\n');

    const afterYaml = [
      "version: '1'",
      'name: Open PRs Report',
      'description: New updated description.',
      '',
      'enabled: true',
      'tags:',
      '  - github',
      '',
      'steps:',
      '  - name: step1',
      '    type: console',
      '    with:',
      '      message: hello',
      '',
    ].join('\n');

    const result = computeChanges(editorContent, afterYaml, 'p1');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('replace');
    expect(result[0].startLine).toBe(3);
    expect(result[0].endLine).toBe(3);
    expect(result[0].newText).toContain('New updated description');
    expect(result[0].newText).not.toContain('step1');
    expect(result[0].newText).not.toContain('enabled');
  });

  it('returns empty array when before and after are identical', () => {
    const yaml = 'name: test\nsteps:\n  - name: s1\n    type: console\n';
    expect(computeChanges(yaml, yaml, 'p1')).toEqual([]);
  });

  it('detects a simple insert in the middle', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nline2\nnewline\nline3\n';

    const result = computeChanges(before, after, 'p1');
    expect(result).toEqual([
      {
        proposalId: 'p1',
        type: 'insert',
        startLine: 3,
        newText: 'newline\n',
      },
    ]);
  });

  it('detects a replace', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nchanged\nline3\n';

    const result = computeChanges(before, after, 'p1');
    expect(result).toEqual([
      {
        proposalId: 'p1',
        type: 'replace',
        startLine: 2,
        endLine: 2,
        newText: 'changed\n',
      },
    ]);
  });

  it('detects a delete', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nline3\n';

    const result = computeChanges(before, after, 'p1');
    expect(result).toEqual([
      {
        proposalId: 'p1',
        type: 'delete',
        startLine: 2,
        endLine: 2,
        newText: '',
      },
    ]);
  });

  it('handles insert at end when before has trailing newline', () => {
    const before = 'name: test\nsteps:\n  - name: s1\n    type: console\n';
    const after =
      'name: test\nsteps:\n  - name: s1\n    type: console\n  - name: s2\n    type: console\n';

    const result = computeChanges(before, after, 'p1');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('insert');
    expect(result[0].newText).toContain('- name: s2');
  });

  it('handles insert at end when before has NO trailing newline', () => {
    const before = 'name: test\nsteps:\n  - name: s1\n    type: console';
    const after =
      'name: test\nsteps:\n  - name: s1\n    type: console\n  - name: s2\n    type: console\n';

    const result = computeChanges(before, after, 'p1');
    expect(result.length).toBeGreaterThanOrEqual(1);
    const insertHunk = result.find((c) => c.newText.includes('- name: s2'));
    expect(insertHunk).toBeDefined();
  });

  it('handles insert after ESQL step without trailing newline', () => {
    const before = [
      'name: test_coalesce_safe',
      'enabled: true',
      '',
      'triggers:',
      '  - type: manual',
      '',
      'steps:',
      '  - name: test_values',
      '    type: console',
      '    with:',
      '      message: "3"',
      '',
      '  - name: esql_coalesce_test',
      '    type: elasticsearch.esql.query',
      '    with:',
      '      format: json',
      '      query: |',
      '        FROM test_properties',
      '        | EVAL bedrooms_checked = COALESCE(?, 0)',
      '        | KEEP bedrooms_checked',
      '      params:',
      '        - "{{ steps.test_values.output.message }}"',
    ].join('\n');

    const after = `${before}\n  - name: print_hello_world\n    type: console\n    with:\n      message: hello world\n`;

    const result = computeChanges(before, after, 'p1');
    expect(result.length).toBeGreaterThanOrEqual(1);
    const insertHunk = result.find((c) => c.newText.includes('- name: print_hello_world'));
    expect(insertHunk).toBeDefined();
    expect(insertHunk!.newText).toContain('    type: console');
    expect(insertHunk!.newText).not.toContain('esql_coalesce_test');
  });

  it('merges adjacent replace + insert into a single replace hunk', () => {
    const before = 'line1\nold-line\nline3\n';
    const after = 'line1\nnew-line\nextra\nline3\n';

    const result = computeChanges(before, after, 'p1');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('replace');
    expect(result[0].startLine).toBe(2);
    expect(result[0].endLine).toBe(2);
    expect(result[0].newText).toBe('new-line\nextra\n');
  });

  it('merges adjacent delete + insert into a single replace hunk', () => {
    const before = 'line1\nto-delete\nline3\n';
    const after = 'line1\ninserted\nline3\n';

    const result = computeChanges(before, after, 'p1');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('replace');
  });

  it('produces multiple hunks for non-adjacent changes', () => {
    const before = [
      'name: my-workflow',
      'description: old description',
      '',
      'triggers:',
      '  - type: manual',
      '',
      'steps:',
      '  - name: step1',
      '    type: console',
      '    with:',
      '      message: old message',
    ].join('\n');

    const after = [
      'name: my-workflow',
      'description: new description',
      '',
      'triggers:',
      '  - type: manual',
      '',
      'steps:',
      '  - name: step1',
      '    type: console',
      '    with:',
      '      message: new message',
    ].join('\n');

    const result = computeChanges(before, after, 'p1');
    expect(result).toHaveLength(2);
    expect(result[0].newText).toContain('new description');
    expect(result[1].newText).toContain('new message');
  });

  it('produces multiple hunks for delete + insert in separate regions', () => {
    const before = ['line1', 'line2-to-delete', 'line3', 'line4', 'line5'].join('\n');

    const after = ['line1', 'line3', 'line4', 'line5', 'line6-added'].join('\n');

    const result = computeChanges(before, after, 'p1');
    expect(result).toHaveLength(2);

    const deleteHunk = result.find((c) => c.type === 'delete');
    expect(deleteHunk).toBeDefined();
    expect(deleteHunk!.startLine).toBe(2);

    const insertHunk = result.find((c) => c.type === 'insert');
    expect(insertHunk).toBeDefined();
    expect(insertHunk!.newText).toContain('line6-added');
  });
});

/**
 * Integration-style tests: server-side modifyWorkflowProperty produces YAML,
 * client-side computeChanges produces hunks. We simulate applying hunks to
 * a "model" and verify correct behavior across sequential edits.
 */
describe('server → client integration: sequential edits', () => {
  const applyChanges = (content: string, proposalId: string, afterYaml: string): string => {
    const changes = computeChanges(content, afterYaml, proposalId);
    let model = content;
    const lines = () => model.split('\n');

    for (let i = changes.length - 1; i >= 0; i--) {
      const change = changes[i];
      const modelLines = lines();
      const endLine = change.endLine ?? change.startLine;

      if (change.type === 'insert') {
        const before = modelLines.slice(0, change.startLine - 1);
        const after = modelLines.slice(change.startLine - 1);
        model = [...before, ...change.newText.split('\n').slice(0, -1), ...after].join('\n');
      } else if (change.type === 'replace') {
        const before = modelLines.slice(0, change.startLine - 1);
        const after = modelLines.slice(endLine);
        model = [...before, ...change.newText.split('\n').slice(0, -1), ...after].join('\n');
      } else if (change.type === 'delete') {
        const before = modelLines.slice(0, change.startLine - 1);
        const after = modelLines.slice(endLine);
        model = [...before, ...after].join('\n');
      }
    }
    return model;
  };

  const WORKFLOW_YAML = `version: "1"
name: Open PRs Report for Team One Workflow
description: Fetches open PRs labeled "Team One Workflow" from elastic/kibana via the GitHub API daily at 9:00 AM (Asia/Tbilisi), groups them by author, and posts a formatted summary to slack.

enabled: true
tags:
  - github
  - slack
  - team one workflow

inputs:
  properties:
    label:
      type: string
      description: "GitHub label to filter PRs by"
      default: "Team:One Workflow"
  required:
    - label
  additionalProperties: false

consts:
  github_search_url: 'https://api.github.com/search/issues?q=is%3Apr+label%3A"{{ inputs.label | url_encode }}"+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100'

triggers:
  - type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        byhour:
          - 9
        byminute:
          - 0
        tzid: Asia/Tbilisi

steps:
  - name: get_prs_from_github
    type: http
    with:
      url: "{{ consts.github_search_url }}"
      method: GET
      headers:
        Accept: application/vnd.github+json
`;

  const MADRID_TRIGGERS = [
    {
      type: 'scheduled',
      with: {
        rrule: {
          freq: 'DAILY',
          interval: 1,
          byhour: [9],
          byminute: [0],
          tzid: 'Europe/Madrid',
        },
      },
    },
  ];

  it('timezone change produces exactly one hunk with no spurious trailing newline', () => {
    const result = modifyWorkflowProperty(WORKFLOW_YAML, 'triggers', MADRID_TRIGGERS);
    expect(result.success).toBe(true);

    const changes = computeChanges(WORKFLOW_YAML, result.yaml, 'tz-change');

    expect(changes).toHaveLength(1);
    expect(changes[0].newText).toContain('Europe/Madrid');
    expect(changes[0].newText).not.toMatch(/\n\n/);
  });

  it('second edit (description) after first (timezone) produces independent hunks', () => {
    const step1Result = modifyWorkflowProperty(WORKFLOW_YAML, 'triggers', MADRID_TRIGGERS);
    expect(step1Result.success).toBe(true);

    const modelAfterStep1 = applyChanges(WORKFLOW_YAML, 'tz-change', step1Result.yaml);

    const step2Result = modifyWorkflowProperty(step1Result.yaml, 'description', 'Updated report');
    expect(step2Result.success).toBe(true);

    const step2Changes = computeChanges(modelAfterStep1, step2Result.yaml, 'desc-change');

    expect(step2Changes).toHaveLength(1);
    expect(step2Changes[0].newText).toContain('Updated report');
    expect(step2Changes[0].newText).not.toContain('Europe/Madrid');
  });

  it('model content matches afterYaml after applying all hunks', () => {
    const step1Result = modifyWorkflowProperty(WORKFLOW_YAML, 'triggers', MADRID_TRIGGERS);
    expect(step1Result.success).toBe(true);

    const modelAfterStep1 = applyChanges(WORKFLOW_YAML, 'tz-change', step1Result.yaml);

    const step2Result = modifyWorkflowProperty(step1Result.yaml, 'description', 'Updated report');
    expect(step2Result.success).toBe(true);

    const modelAfterStep2 = applyChanges(modelAfterStep1, 'desc-change', step2Result.yaml);

    expect(modelAfterStep2.trim()).toBe(step2Result.yaml.trim());
  });

  it('three sequential edits produce one hunk each', () => {
    const step1Result = modifyWorkflowProperty(WORKFLOW_YAML, 'triggers', MADRID_TRIGGERS);
    expect(step1Result.success).toBe(true);
    const changes1 = computeChanges(WORKFLOW_YAML, step1Result.yaml, 'tz');
    const model1 = applyChanges(WORKFLOW_YAML, 'tz', step1Result.yaml);

    const step2Result = modifyWorkflowProperty(step1Result.yaml, 'description', 'Updated report');
    expect(step2Result.success).toBe(true);
    const changes2 = computeChanges(model1, step2Result.yaml, 'desc');
    const model2 = applyChanges(model1, 'desc', step2Result.yaml);

    const step3Result = modifyWorkflowProperty(step2Result.yaml, 'enabled', false);
    expect(step3Result.success).toBe(true);
    const changes3 = computeChanges(model2, step3Result.yaml, 'enabled');

    expect(changes1).toHaveLength(1);
    expect(changes2).toHaveLength(1);
    expect(changes3).toHaveLength(1);
  });

  it('no phantom hunks appear when model already matches afterYaml', () => {
    const result = modifyWorkflowProperty(WORKFLOW_YAML, 'description', 'New desc');
    expect(result.success).toBe(true);

    const model = applyChanges(WORKFLOW_YAML, 'desc', result.yaml);
    const phantomChanges = computeChanges(model, result.yaml, 'phantom');
    expect(phantomChanges).toHaveLength(0);
  });
});

/**
 * Regression tests using exact payloads captured from the running app.
 * The server's beforeYaml/afterYaml end with double newlines (\n\n) while
 * the editor model typically ends with a single newline. Without trailing
 * newline normalization, this produces a spurious insert hunk at the end of
 * the file, far from the actual change — appearing as a second
 * Accept/Decline pill.
 */
describe('real payload regression: trailing newline mismatch', () => {
  const REAL_BEFORE_YAML = [
    "version: '1'",
    'name: Open PRs Report for Team One Workflow',
    'description: Fetches open PRs labeled "Team:One Workflow" from elastic/kibana via the GitHub API daily at 9:00 AM (Asia/Tbilisi), groups them by author, and posts a formatted summary to Slack.',
    '',
    'enabled: true',
    'tags:',
    '  - github',
    '  - slack',
    '  - team-one-workflow',
    '',
    'inputs:',
    '  properties:',
    '    label:',
    '      type: string',
    '      description: "GitHub label to filter PRs by"',
    '      default: "Team:One Workflow"',
    '  required:',
    '    - label',
    '  additionalProperties: false',
    '',
    'consts:',
    '  github_search_url: "https://api.github.com/search/issues?q=is%3Apr+label%3A%22{{ inputs.label | url_encode }}%22+is%3Aopen+repo%3Aelastic%2Fkibana&per_page=100"',
    '',
    'triggers:',
    '  - type: scheduled',
    '    with:',
    '      rrule:',
    '        freq: DAILY',
    '        interval: 1',
    '        byhour:',
    '          - 9',
    '        byminute:',
    '          - 0',
    '        tzid: Asia/Tbilisi',
    '',
    'steps:',
    '  - name: get_prs_from_github',
    '    type: http',
    '    with:',
    '      url: "{{ consts.github_search_url }}"',
    '      method: GET',
    '      headers:',
    '        Accept: application/vnd.github+json',
    '',
    '  - name: send_slack_message',
    '    type: slack',
    '    connector-id: 0ee5d857-3653-4ee2-930f-638cf2a1d990',
    '    with:',
    '      message: "{{ steps.format_slack_message.output.message }}"',
    '',
  ].join('\n');

  const REAL_AFTER_YAML_TZ = REAL_BEFORE_YAML.replace('tzid: Asia/Tbilisi', 'tzid: Europe/Madrid');

  const REAL_AFTER_YAML_DESC = REAL_AFTER_YAML_TZ.replace('(Asia/Tbilisi)', '(Europe/Madrid)');

  it('timezone change: editor with single trailing newline vs afterYaml with double produces one hunk', () => {
    const editorContent = REAL_BEFORE_YAML.replace(/\n+$/, '\n');

    const changes = computeChanges(editorContent, REAL_AFTER_YAML_TZ, 'tz-change');

    expect(changes).toHaveLength(1);
    expect(changes[0].newText).toContain('Europe/Madrid');
    expect(changes[0].newText).not.toContain('send_slack_message');
  });

  it('second event after first: only description hunk, no timezone duplication', () => {
    const editorContent = REAL_BEFORE_YAML.replace(/\n+$/, '\n');

    const changes1 = computeChanges(editorContent, REAL_AFTER_YAML_TZ, 'tz');
    expect(changes1).toHaveLength(1);

    let model = editorContent;
    const change = changes1[0];
    const lines = model.split('\n');
    const endLine = change.endLine ?? change.startLine;
    const before = lines.slice(0, change.startLine - 1);
    const after = lines.slice(endLine);
    model = [...before, ...change.newText.split('\n').slice(0, -1), ...after].join('\n');

    const changes2 = computeChanges(model, REAL_AFTER_YAML_DESC, 'desc');

    expect(changes2).toHaveLength(1);
    expect(changes2[0].newText).toContain('Europe/Madrid');
    expect(changes2[0].newText).not.toContain('tzid');
  });

  it('afterYaml ending with double newline does not produce trailing insert hunk', () => {
    const editorContent = REAL_BEFORE_YAML.replace(/\n+$/, '\n');
    const afterWithDoubleNewline = editorContent.replace(/\n+$/, '\n\n');

    const changes = computeChanges(editorContent, afterWithDoubleNewline, 'no-op');
    expect(changes).toHaveLength(0);
  });
});
