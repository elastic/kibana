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
import FLOOR_ALERT_TRIAGE_BATCH_YAML from './floor_alert_triage_batch.yaml';
import { ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS } from './worker_settings_defaults';
import { renderAlertTriageWorkerYaml } from './worker_template_values';
import { ConcurrencySettingsSchema } from '../../../spec/schema';

interface YamlStep {
  name: string;
  type?: string;
  if?: string;
  foreach?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  'on-failure'?: { continue?: boolean; retry?: { 'max-attempts'?: number } };
}

interface ParsedSweep {
  settings: { concurrency: Record<string, unknown> };
  triggers: Array<{ type: string; with?: { every: string } }>;
  outputs: Array<{ name: string }>;
  consts: { batch_workflow_id: string };
  steps: YamlStep[];
}

const rendered = parse(
  renderAlertTriageWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, {
    settingsVersion: 1,
    autonomyLevel: 'supervised',
    scheduleInterval: '15m',
    extras: {
      ...ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.extras.defaultValue,
    },
  })
) as ParsedSweep;

const batch = parse(FLOOR_ALERT_TRIAGE_BATCH_YAML) as {
  triggers: Array<{ type: string; inputs?: { properties: object; required: string[] } }>;
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);
const allSteps = flatten(rendered.steps);
const stepByName = (name: string): YamlStep => {
  const step = allSteps.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`No step named ${name}`);
  return step;
};

describe('floor_alert_triage — the scheduled sweep', () => {
  describe('triggers and concurrency', () => {
    it('runs on the configured schedule and by hand, and no longer on a rule execution', () => {
      expect(rendered.triggers.map(({ type }) => type)).toEqual(['scheduled', 'manual']);
      expect(rendered.triggers[0].with?.every).toBe('15m');
    });

    it('drops an overlapping sweep, so there is one planner and one writer of claims per space', () => {
      expect(ConcurrencySettingsSchema.safeParse(rendered.settings.concurrency).success).toBe(true);
      expect(rendered.settings.concurrency).toEqual(
        expect.objectContaining({ strategy: 'drop', max: 1 })
      );
    });

    it('reads no rule execution event, which a scheduled run does not have', () => {
      expect(FLOOR_ALERT_TRIAGE_YAML).not.toMatch(/\bevent\./);
    });
  });

  describe('order', () => {
    it('checks analysis, then headroom, then plans, then starts batches, then reports', () => {
      expect(rendered.steps.map(({ name }) => name)).toEqual([
        'fetch_analysis_runtime_config',
        'require_analysis_enabled',
        'read_headroom',
        'plan_sweep',
        'start_batches',
        'emit_result',
      ]);
    });
  });

  describe('planning inputs', () => {
    it('takes the budget, look-back and interval from the Worker settings', () => {
      expect(stepByName('plan_sweep').with).toEqual(
        expect.objectContaining({
          budget_per_hour: '${{ consts.worker_settings.extras.budgetPerHour }}',
          lookback_hours: '${{ consts.worker_settings.extras.lookbackHours }}',
          interval_minutes: '${{ consts.schedule_interval_minutes }}',
          headroom: '${{ steps.read_headroom.output }}',
        })
      );
    });
  });

  describe('Worker → batch contract', () => {
    const batchInputs = batch.triggers.find(({ type }) => type === 'manual')?.inputs;

    it('starts the batch workflow it counts live batches of', () => {
      expect(stepByName('start_batch').with?.['workflow-id']).toBe(
        rendered.consts.batch_workflow_id
      );
      expect(stepByName('read_headroom').with?.batch_workflow_id).toContain(
        'consts.batch_workflow_id'
      );
    });

    it('passes exactly the inputs the batch declares and requires', () => {
      const passed = Object.keys(
        (stepByName('start_batch').with?.inputs as Record<string, unknown>) ?? {}
      ).sort();

      expect(passed).toEqual(Object.keys(batchInputs?.properties ?? {}).sort());
      expect(passed).toEqual([...(batchInputs?.required ?? [])].sort());
    });

    it('starts the batch asynchronously, so the sweep never waits for analysis', () => {
      expect(stepByName('start_batch').type).toBe('workflow.executeAsync');
    });

    it('passes the rule, the alert ids and the Worker settings the batch cannot read itself', () => {
      expect(stepByName('start_batch').with?.inputs).toEqual({
        rule_id: '{{ foreach.item.rule_id }}',
        rule_name: '{{ foreach.item.rule_name }}',
        alert_ids: '${{ foreach.item.alert_ids }}',
        autonomy: '{{ consts.worker_settings.autonomy }}',
        confidence_floor:
          '${{ consts.worker_settings.extras.autoCloseConfidenceScoreMinThreshold }}',
      });
    });
  });

  describe('linking a batch to its rule', () => {
    it('records the batch execution id on that batch’s alerts as az:triage_exec:<id>', () => {
      expect(stepByName('record_batch_execution').with).toEqual(
        expect.objectContaining({
          ids: '${{ foreach.item.alert_ids }}',
          tags: {
            tags_to_add: ['az:triage_exec:{{ steps.start_batch.output.executionId }}'],
            tags_to_remove: [],
          },
        })
      );
    });

    it('records it only when the batch started, and retries the write without failing the sweep', () => {
      const step = stepByName('record_batch_execution');

      expect(step.if).toBe('${{ steps.start_batch.error == blank }}');
      expect(step['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '5s' },
        continue: true,
      });
    });

    it('does not let one batch that cannot be started stop the others', () => {
      expect(stepByName('start_batch')['on-failure']).toEqual({ continue: true });
    });
  });

  describe('sweep output', () => {
    it('emits exactly the declared outputs, so an idle sweep can be told from a blocked one', () => {
      const emitted = Object.keys(stepByName('emit_result').with ?? {}).sort();

      expect(emitted).toEqual(rendered.outputs.map(({ name }) => name).sort());
      expect(emitted).toContain('skip_reason');
      expect(emitted).toContain('aged_out_alerts');
    });
  });

  describe('analysis preflight', () => {
    it('fails the sweep, not the batches, when Alert Analysis is off', () => {
      expect(stepByName('abort_analysis_disabled').type).toBe('workflow.fail');
      expect(stepByName('require_analysis_enabled').if).toBeUndefined();
    });
  });
});
