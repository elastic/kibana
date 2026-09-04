/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';

import type { Job } from '#pipeline-utils';

import {
  buildNotifyPipelineYaml,
  collectFailedScriptJobs,
  composeChannelMessage,
  displayNameForJob,
  groupJobsByChannel,
} from './notify_failed_suites';

const job = (overrides: Partial<Job>): Job =>
  ({
    id: 'job-1',
    type: 'script',
    name: 'Detection Engine - Security Solution Cypress Tests',
    step_key: null,
    state: 'failed',
    retried: false,
    soft_failed: false,
    web_url: 'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/1#job-1',
    ...overrides,
  } as Job);

describe('collectFailedScriptJobs', () => {
  it('keeps failed script jobs and drops passed, retried, and wait jobs', () => {
    const jobs = [
      job({ id: 'failed', state: 'failed' }),
      job({
        id: 'passed',
        state: 'passed',
        name: 'Explore - Security Solution Cypress Tests',
      }),
      job({ id: 'retried', retried: true, retried_in_job_id: 'retry' }),
      job({ id: 'wait', type: 'waiter', name: 'wait' }),
      job({
        id: 'notify',
        step_key: 'notify_owning_teams',
        name: ':slack: Notify owning teams of Security on-merge failures',
        state: 'failed',
      }),
    ];

    const failed = collectFailedScriptJobs(jobs, (candidate) => candidate.state === 'passed');
    expect(failed.map((item) => item.id)).toEqual(['failed']);
  });
});

describe('groupJobsByChannel', () => {
  it('groups failed jobs by owning team channel', () => {
    const grouped = groupJobsByChannel([
      {
        id: 'de',
        name: 'Detection Engine - Security Solution Cypress Tests',
        webUrl: 'https://example.test/de',
      },
      {
        id: 'rm',
        name: 'Rule Management - Security Solution Cypress Tests',
        webUrl: 'https://example.test/rm',
      },
      {
        id: 'dw',
        name: 'Defend Workflows Cypress Tests',
        webUrl: 'https://example.test/dw',
      },
    ]);

    expect([...grouped.keys()]).toEqual([
      '#security-detection-engineering-team',
      '#security-defend-workflows',
    ]);
    expect(grouped.get('#security-detection-engineering-team')).toHaveLength(2);
  });
});

describe('displayNameForJob', () => {
  it('strips parallelism suffixes', () => {
    expect(displayNameForJob('Defend Workflows Cypress Tests (3/24)')).toBe(
      'Defend Workflows Cypress Tests'
    );
    expect(displayNameForJob('Defend Workflows Cypress Tests / 3/24')).toBe(
      'Defend Workflows Cypress Tests'
    );
  });
});

describe('composeChannelMessage', () => {
  it('collapses parallel shards and includes the build link', () => {
    const message = composeChannelMessage(
      [
        {
          id: 'a',
          name: 'Defend Workflows Cypress Tests (1/24)',
          webUrl: 'https://example.test/a',
        },
        {
          id: 'b',
          name: 'Defend Workflows Cypress Tests (2/24)',
          webUrl: 'https://example.test/b',
        },
      ],
      'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473',
      473
    );

    expect(message).toContain(':alert: *kibana-security-solution-on-merge* failed');
    expect(message).toContain('Defend Workflows Cypress Tests (2 failed jobs)');
    expect(message).toContain(
      '<https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473|View build #473>'
    );
  });
});

describe('buildNotifyPipelineYaml', () => {
  it('opens with a continue_on_failure boundary so the steps run on a red build', () => {
    const yaml = buildNotifyPipelineYaml(new Map([['#security-threat-hunting', 'failed']]));
    const parsed = parseYaml(yaml) as { steps: Array<Record<string, unknown>> };

    expect(parsed.steps[0]).toEqual({ wait: null, continue_on_failure: true });
  });

  it('uploads one notify.slack step per channel', () => {
    const yaml = buildNotifyPipelineYaml(
      new Map([
        ['#security-threat-hunting', 'threat hunting failed'],
        ['#security-defend-workflows', 'defend workflows failed'],
      ])
    );
    const parsed = parseYaml(yaml) as { steps: Array<Record<string, unknown>> };

    expect(parsed.steps.filter((step) => 'notify' in step)).toHaveLength(2);
    expect(yaml).toContain('#security-threat-hunting');
    expect(yaml).toContain('#security-defend-workflows');
    expect(yaml).toContain('threat hunting failed');
    expect(yaml).toContain('family/kibana-ubuntu-2404');
    expect(yaml).toMatch(/step\.outcome == ["']passed["']/);
    expect(yaml).not.toContain('#sdh-security-team');
  });
});
