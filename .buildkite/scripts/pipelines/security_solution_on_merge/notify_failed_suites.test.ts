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
  SLACK_NOTIFY_UPLOADED_META_KEY,
  buildNotifyPipelineYaml,
  collectFailedScriptJobs,
  composeChannelMessage,
  composeFanOutFailureMessage,
  displayNameForJob,
  groupJobsByChannel,
  notifyFailedSuites,
} from './notify_failed_suites.ts';

import { FALLBACK_SLACK_CHANNEL } from './failed_suite_channels.ts';

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

const BUILD_URL = 'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473';

/** Real-world label and job-URL lengths, which is what the Slack budget has to survive. */
const realisticJobs = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `0199e2bb-6f4c-4a1b-9d3e-${String(index).padStart(12, '0')}`,
    name: `Rule Management - Prebuilt Rules Upgrade ${index} - Security Solution Cypress Tests`,
    webUrl: `${BUILD_URL}#0199e2bb-6f4c-4a1b-9d3e-${String(index).padStart(12, '0')}`,
  }));

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

  it('routes parallel-suffixed job names to the same channels as bare labels', () => {
    const grouped = groupJobsByChannel([
      {
        id: 'dw-1',
        name: 'Defend Workflows Cypress Tests (3/24)',
        webUrl: 'https://example.test/dw-1',
      },
      {
        id: 'de-1',
        name: 'Detection Engine - Security Solution Cypress Tests / 2/8',
        webUrl: 'https://example.test/de-1',
      },
    ]);

    expect([...grouped.keys()]).toEqual([
      '#security-defend-workflows',
      '#security-detection-engineering-team',
    ]);
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

  it('lists every failed step when the message fits in the Slack budget', () => {
    const message = composeChannelMessage(realisticJobs(5), BUILD_URL, 473);

    expect(message).toContain('Rule Management - Prebuilt Rules Upgrade 4');
    expect(message).not.toContain('more failed step');
  });

  it('drops entries to stay under the Slack block limit and reports the remainder', () => {
    const jobs = realisticJobs(40);

    const message = composeChannelMessage(jobs, BUILD_URL, 473);

    expect(message.length).toBeLessThanOrEqual(3000);

    const listed = message.split('\n').filter((line) => line.includes('|[job]>')).length;
    expect(listed).toBeGreaterThan(0);
    expect(listed).toBeLessThan(jobs.length);
    expect(message).toContain(`…and ${jobs.length - listed} more failed steps`);
  });

  it('keeps the build link when almost everything is dropped', () => {
    const message = composeChannelMessage(realisticJobs(200), BUILD_URL, 473);

    expect(message.length).toBeLessThanOrEqual(3000);
    expect(message).toContain(`<${BUILD_URL}|View build #473>`);
  });
});

describe('composeFanOutFailureMessage', () => {
  it('asks SDH to page teams manually and links the build', () => {
    const message = composeFanOutFailureMessage(
      new Error('Buildkite API 401'),
      'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473',
      473
    );

    expect(message).toContain('owning-team Slack fan-out failed');
    expect(message).toContain('team channels were not notified');
    expect(message).toContain('Buildkite API 401');
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

  it('uploads one non-preemptible notify.slack step per channel with a stable key', () => {
    const yaml = buildNotifyPipelineYaml(
      new Map([
        ['#security-threat-hunting', 'threat hunting failed'],
        ['#security-defend-workflows', 'defend workflows failed'],
      ])
    );
    const parsed = parseYaml(yaml) as {
      steps: Array<{
        key?: string;
        env?: Record<string, string>;
        agents?: { preemptible?: boolean };
        retry?: { automatic: Array<{ exit_status: string | number; limit: number }> };
        notify?: Array<{ slack: { channels: string[]; message: string } }>;
      }>;
    };
    const notifySteps = parsed.steps.filter((step) => step.notify);

    expect(notifySteps).toHaveLength(2);
    expect(notifySteps[0].key).toBe('notify-owning-team-security-threat-hunting');
    expect(notifySteps[1].key).toBe('notify-owning-team-security-defend-workflows');
    expect(notifySteps[0].agents?.preemptible).toBe(false);
    expect(notifySteps[1].agents?.preemptible).toBe(false);
    expect(notifySteps[0].retry).toEqual({
      automatic: [{ exit_status: -1, limit: 3 }],
    });
    expect(notifySteps[0].env).toEqual({ SKIP_NODE_SETUP: 'true' });
    expect(notifySteps[0].notify?.[0].slack.channels).toEqual(['#security-threat-hunting']);
    expect(notifySteps[0].notify?.[0].slack.message).toBe('threat hunting failed');
    expect(notifySteps[1].notify?.[0].slack.channels).toEqual(['#security-defend-workflows']);
    expect(yaml).toMatch(/step\.outcome == ["']passed["']/);
    expect(yaml).not.toContain('#sdh-security-team');
  });
});

describe('notifyFailedSuites', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BUILDKITE: 'true' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('skips upload when slack notify meta-data is already set', async () => {
    const upload = jest.fn();
    const buildkite = {
      getMetadata: jest.fn().mockReturnValue('true'),
      setMetadata: jest.fn(),
      getCurrentBuild: jest.fn(),
      getJobStatus: jest.fn(),
    };

    await notifyFailedSuites(buildkite as any, { upload });

    expect(buildkite.getMetadata).toHaveBeenCalledWith(SLACK_NOTIFY_UPLOADED_META_KEY);
    expect(buildkite.getCurrentBuild).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(buildkite.setMetadata).not.toHaveBeenCalled();
  });

  it('marks meta-data after a successful fan-out so retries cannot double-post', async () => {
    const upload = jest.fn();
    const buildkite = {
      getMetadata: jest.fn().mockReturnValue(null),
      setMetadata: jest.fn(),
      getCurrentBuild: jest.fn().mockResolvedValue({
        web_url: 'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473',
        number: 473,
        jobs: [job({ id: 'failed', state: 'failed' })],
      }),
      getJobStatus: jest.fn().mockReturnValue({ success: false, state: 'failed' }),
    };

    await notifyFailedSuites(buildkite as any, { upload });

    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining('#security-detection-engineering-team')
    );
    expect(buildkite.setMetadata).toHaveBeenCalledWith(SLACK_NOTIFY_UPLOADED_META_KEY, 'true');
  });

  it('does not false-alarm SDH when meta-data fails after a successful upload', async () => {
    const upload = jest.fn();
    const buildkite = {
      getMetadata: jest.fn().mockReturnValue(null),
      setMetadata: jest.fn().mockImplementation(() => {
        throw new Error('meta-data write failed');
      }),
      setAnnotation: jest.fn(),
      getCurrentBuild: jest.fn().mockResolvedValue({
        web_url: 'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473',
        number: 473,
        jobs: [job({ id: 'failed', state: 'failed' })],
      }),
      getJobStatus: jest.fn().mockReturnValue({ success: false, state: 'failed' }),
    };

    await expect(notifyFailedSuites(buildkite as any, { upload })).resolves.toBeUndefined();

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toContain('#security-detection-engineering-team');
    expect(buildkite.setAnnotation).not.toHaveBeenCalled();
  });

  it('posts to #sdh-security-team when fan-out fails, then rethrows', async () => {
    const upload = jest.fn();
    const buildkite = {
      getMetadata: jest.fn().mockReturnValue(null),
      setMetadata: jest.fn(),
      setAnnotation: jest.fn(),
      getCurrentBuild: jest.fn().mockRejectedValue(new Error('Buildkite API 500')),
      getJobStatus: jest.fn(),
    };

    await expect(notifyFailedSuites(buildkite as any, { upload })).rejects.toThrow(
      'Buildkite API 500'
    );

    expect(upload).toHaveBeenCalledTimes(1);
    const fallbackYaml = upload.mock.calls[0][0] as string;
    expect(fallbackYaml).toContain(FALLBACK_SLACK_CHANNEL);
    expect(fallbackYaml).toContain('owning-team Slack fan-out failed');
    expect(fallbackYaml).toContain('notify-owning-team-fanout-failure');
    expect(fallbackYaml).toContain('Buildkite API 500');
    expect(buildkite.setAnnotation).toHaveBeenCalledWith(
      'security-solution-on-merge-slack-fanout',
      'error',
      expect.stringContaining(FALLBACK_SLACK_CHANNEL)
    );
    expect(buildkite.setMetadata).toHaveBeenCalledWith(SLACK_NOTIFY_UPLOADED_META_KEY, 'true');
  });

  it('annotates even when the SDH fallback upload also fails, then rethrows', async () => {
    const upload = jest.fn().mockImplementation(() => {
      throw new Error('pipeline upload failed');
    });
    const buildkite = {
      getMetadata: jest.fn().mockReturnValue(null),
      setMetadata: jest.fn(),
      setAnnotation: jest.fn(),
      getCurrentBuild: jest.fn().mockResolvedValue({
        web_url: 'https://buildkite.com/elastic/kibana-security-solution-on-merge/builds/473',
        number: 473,
        jobs: [job({ id: 'failed', state: 'failed' })],
      }),
      getJobStatus: jest.fn().mockReturnValue({ success: false, state: 'failed' }),
    };

    await expect(notifyFailedSuites(buildkite as any, { upload })).rejects.toThrow(
      'pipeline upload failed'
    );
    // Main upload fails, annotate runs, then fallback upload is attempted (and also fails).
    expect(upload).toHaveBeenCalledTimes(2);
    expect(buildkite.setAnnotation).toHaveBeenCalledWith(
      'security-solution-on-merge-slack-fanout',
      'error',
      expect.stringContaining('pipeline upload failed')
    );
    expect(buildkite.setMetadata).not.toHaveBeenCalled();
  });
});
