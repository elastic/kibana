/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import { renderCommonWorkerYaml, renderScheduledWorkerYaml } from './worker_template_values';

interface WorkflowStep {
  name?: string;
  type?: string;
  'agent-id'?: string;
  steps?: WorkflowStep[];
  branches?: Array<{ steps?: WorkflowStep[] }>;
}

const flattenSteps = (steps: WorkflowStep[] = []): WorkflowStep[] =>
  steps.flatMap((step) => [
    step,
    ...flattenSteps(step.steps),
    ...flattenSteps((step.branches ?? []).flatMap((branch) => branch.steps ?? [])),
  ]);

const parseSteps = (yaml: string): WorkflowStep[] =>
  flattenSteps((parse(yaml) as { steps?: WorkflowStep[] }).steps);

/** Steps that actually dispatch to an agent, i.e. the ones `agent-id` governs. */
const agentSteps = (yaml: string): WorkflowStep[] =>
  parseSteps(yaml).filter((step) => step.type === 'ai.agent');

const AGENT = 'significant-events.investigation';

const scheduled = (agentId?: string) => ({
  settingsVersion: 1,
  autonomyLevel: 'manual' as const,
  scheduleInterval: '24h',
  ...(agentId === undefined ? {} : { agentId }),
});

describe('Worker agent id propagation', () => {
  describe('when the Worker has an agent', () => {
    it('sends every agent step to the picked agent', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled(AGENT));
      const steps = agentSteps(rendered);

      // Guards the assertion below: an empty list would make `every` vacuously true.
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.map((step) => step['agent-id'])).toEqual(steps.map(() => AGENT));
    });

    it('overrides an agent the workflow had hardcoded', () => {
      const before = agentSteps(renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled()));
      const after = agentSteps(
        renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled(AGENT))
      );

      // The step names its own agent when nothing is picked, so an unchanged value
      // here would mean the Worker setting never reached it.
      expect(before.map((step) => step['agent-id'])).toEqual(
        before.map(() => 'alertzero-thin-agent')
      );
      expect(after.map((step) => step['agent-id'])).toEqual(after.map(() => AGENT));
    });
  });

  describe('when the Worker has no agent', () => {
    it('leaves each agent step on the agent the workflow declared', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled());
      const steps = agentSteps(rendered);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.map((step) => step['agent-id'])).toEqual(
        steps.map(() => 'alertzero-thin-agent')
      );
    });

    it('renders no placeholder and no empty agent', () => {
      const rendered = renderScheduledWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, scheduled());

      expect(rendered).not.toContain('__WORKER_AGENT_ID__');
      // An empty `agent-id` is not equivalent to an absent one: it would override the
      // step's own agent with nothing rather than leaving it untouched.
      expect(rendered).not.toMatch(/agent-id:\s*(''|""|$)/m);
    });

    it('renders exactly what a plain hardcoded agent would', () => {
      // The strongest statement of "no agent picked changes nothing": the render must
      // equal the same workflow with the placeholder replaced by its own default.
      const rendered = renderCommonWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
      });

      const withoutFeature = FLOOR_ALERT_TRIAGE_YAML.replace(
        '__WORKER_AGENT_ID_OR:alertzero-thin-agent__',
        'alertzero-thin-agent'
      );
      // Guards against a typo silently making this a no-op comparison.
      expect(withoutFeature).not.toBe(FLOOR_ALERT_TRIAGE_YAML);

      expect(rendered).toBe(
        renderCommonWorkerYaml(withoutFeature, {
          settingsVersion: 1,
          autonomyLevel: 'manual',
        })
      );
    });
  });
});
