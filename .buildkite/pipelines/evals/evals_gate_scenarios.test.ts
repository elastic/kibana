/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import { getDecisionPathMatches } from './evals_gate_rules.ts';
import type { GateApi } from './evals_gate_workflow.ts';
import { runEvalsGate } from './evals_gate_workflow.ts';

// Runs the gate against the real evals.suites.json, so a config change that would flag the wrong
// PRs (or stop flagging the right ones) fails here.
const suites = (
  JSON.parse(Fs.readFileSync(Path.join(__dirname, 'evals.suites.json'), 'utf-8')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

const HEAD = 'ffffffffffffffffffffffffffffffffffffffff';
const NIGHTSHIFT = 'x-pack/solutions/observability/plugins/nightshift_investigations';

const gate = async (changedFiles: string[], labels: string[] = []) => {
  const statuses: Array<{ state: string; description: string }> = [];
  const comments: string[] = [];
  const api: GateApi = {
    getPullRequest: async (prNumber) => ({
      number: prNumber,
      baseRef: 'main',
      headSha: HEAD,
      draft: false,
      author: 'dev',
      labels,
    }),
    findOpenPullRequestNumbers: async () => [],
    listChangedFiles: async () => changedFiles,
    listCommitShas: async () => [HEAD],
    getStatus: async () => undefined,
    listFilesBetween: async () => [],
    setStatus: async ({ state, description }) => {
      statuses.push({ state, description });
    },
    findComment: async () => undefined,
    upsertComment: async (_prNumber, _commentId, body) => {
      comments.push(body);
    },
    deleteComment: async () => undefined,
  };
  const summary = { addRaw: () => summary, write: async () => undefined };
  await runEvalsGate({
    api,
    core: { info: () => undefined, error: () => undefined, summary },
    context: {
      eventName: 'pull_request_target',
      repo: { owner: 'elastic', repo: 'kibana' },
      payload: { pull_request: { number: 1 } },
    },
    readSuites: () => suites,
  });
  return { status: statuses[0], comments };
};

const touchedSuites = (changedFiles: string[]): string[] =>
  suites
    .filter((suite) => getDecisionPathMatches(changedFiles, suite).length > 0)
    .map(({ id }) => id);

describe('evals gate against evals.suites.json', () => {
  // A suite that opts in adds itself here, with scenarios for its own paths below.
  it('only Nightshift Investigations requires a decision so far', () => {
    expect(suites.filter((suite) => suite.requireDecisionOnPaths).map(({ id }) => id)).toEqual([
      'nightshift-investigations',
    ]);
  });

  it.each([
    [
      'Agent Builder',
      [
        'x-pack/platform/plugins/shared/agent_builder/server/audit/audit_events.ts',
        'x-pack/platform/packages/shared/agent-builder/agent-builder-common/agents/prompts.ts',
      ],
    ],
    [
      'Significant Events agents',
      ['x-pack/solutions/observability/plugins/significant_events/server/agent_builder/README.md'],
    ],
    [
      'Nightshift tests, online evals, UI and routes',
      [
        `${NIGHTSHIFT}/server/tools/decision_tree/index.test.ts`,
        `${NIGHTSHIFT}/server/online_evals/judges/alert_outcome_rca_accuracy/index.ts`,
        `${NIGHTSHIFT}/server/step_definitions/score_online_evals_round.ts`,
        `${NIGHTSHIFT}/public/api/index.ts`,
        `${NIGHTSHIFT}/server/routes/archive_memory_page.ts`,
      ],
    ],
    [
      'Nightshift plumbing (telemetry, saved objects, quotas, automations, notifications)',
      [
        `${NIGHTSHIFT}/server/telemetry/index.ts`,
        `${NIGHTSHIFT}/server/saved_objects/index.ts`,
        `${NIGHTSHIFT}/server/lib/investigation_quotas/consume.ts`,
        `${NIGHTSHIFT}/server/lib/automations/schemas.ts`,
        `${NIGHTSHIFT}/server/lib/notifications/slack_notification.ts`,
        `${NIGHTSHIFT}/common/locators/investigation_locator.ts`,
        `${NIGHTSHIFT}/common/automation_schedule.ts`,
      ],
    ],
    [
      'decision trees package config',
      [
        'x-pack/solutions/observability/packages/kbn-nightshift-decision-trees/moon.yml',
        'x-pack/solutions/observability/packages/kbn-nightshift-decision-trees/tsconfig.json',
      ],
    ],
  ])('passes %s changes without a decision or a trigger step', async (_label, files) => {
    expect(touchedSuites(files)).toEqual([]);
    await expect(gate(files)).resolves.toEqual({
      status: { state: 'success', description: 'No evals decision required for these changes' },
      comments: [],
    });
  });

  it.each([
    [
      'the investigator prompt',
      `${NIGHTSHIFT}/server/agents/investigation/instructions/investigator.md.text`,
    ],
    [
      'the Elastic connector guide',
      `${NIGHTSHIFT}/server/tools/sandbox_bash/connector_docs/elastic.md.text`,
    ],
    [
      'the investigation workflow',
      'src/platform/packages/shared/kbn-workflows/managed/definitions/nightshift_investigations/investigation/investigation_workflow.yaml',
    ],
    [
      'the investigation message builder',
      `${NIGHTSHIFT}/server/client/build_investigation_message.ts`,
    ],
    ['the shared custom context definitions', `${NIGHTSHIFT}/common/custom_context.ts`],
    // Not a real folder: a new one is gated by default, without anyone updating the config.
    ['a prompt in a brand-new folder', `${NIGHTSHIFT}/server/new_feature/prompts/system.md.text`],
  ])('requires a Nightshift decision for changes to %s', async (_label, file) => {
    expect(touchedSuites([file])).toEqual(['nightshift-investigations']);
    const { status, comments } = await gate([file]);
    expect(status).toEqual({
      state: 'failure',
      description: 'Evals decision required: add evals:nightshift-investigations or evals:skip',
    });
    expect(comments).toHaveLength(1);
  });

  it('passes a Nightshift change once it is skipped, and waits for the verdict once it runs', async () => {
    const file = `${NIGHTSHIFT}/server/agents/investigation/instructions/investigator.md.text`;
    await expect(gate([file], ['evals:skip'])).resolves.toMatchObject({
      status: { state: 'success' },
    });
    await expect(gate([file], ['evals:nightshift-investigations'])).resolves.toMatchObject({
      status: { state: 'pending' },
    });
  });
});
