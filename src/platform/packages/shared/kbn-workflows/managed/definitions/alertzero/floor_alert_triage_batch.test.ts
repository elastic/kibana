/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ALERT_TRIAGE_BATCH_YAML from './floor_alert_triage_batch.yaml';
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './floor_alert_triage_review.yaml';
import { ConcurrencySettingsSchema } from '../../../spec/schema';
import ALERT_ANALYSIS_YAML from '../alert_analysis/alert_analysis_workflow.yaml';

interface YamlStep {
  name: string;
  type?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  'on-failure'?: { fallback?: YamlStep[] };
}

interface ParsedWorkflow {
  settings?: { concurrency?: Record<string, unknown> };
  triggers: Array<{
    type: string;
    inputs?: { properties: Record<string, unknown>; required?: string[] };
  }>;
  steps: YamlStep[];
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((s) => [
    s,
    ...flatten(s.steps ?? []),
    ...flatten(s.else ?? []),
    ...flatten(s['on-failure']?.fallback ?? []),
  ]);

const batch = parse(FLOOR_ALERT_TRIAGE_BATCH_YAML) as ParsedWorkflow;
const review = parse(FLOOR_ALERT_TRIAGE_REVIEW_YAML) as ParsedWorkflow;
const analysis = parse(ALERT_ANALYSIS_YAML) as ParsedWorkflow;

const batchSteps = flatten(batch.steps);
const stepByName = (name: string) => {
  const step = batchSteps.find((s) => s.name === name);
  if (!step) throw new Error(`No step named ${name}`);
  return step;
};
const manualInputs = (workflow: ParsedWorkflow) =>
  workflow.triggers.find(({ type }) => type === 'manual')?.inputs;

describe('Alert Triage batch workflow', () => {
  describe('input contract (Worker → batch)', () => {
    it('takes exactly the rule, the alert ids, the autonomy and the confidence floor', () => {
      const inputs = manualInputs(batch);

      expect(Object.keys(inputs?.properties ?? {}).sort()).toEqual([
        'alert_ids',
        'autonomy',
        'confidence_floor',
        'rule_id',
        'rule_name',
      ]);
      expect([...(inputs?.required ?? [])].sort()).toEqual([
        'alert_ids',
        'autonomy',
        'confidence_floor',
        'rule_id',
        'rule_name',
      ]);
    });

    it('has no alert trigger and reads no rule execution event, so a sweep can start it', () => {
      expect(batch.triggers.map(({ type }) => type)).toEqual(['manual']);
      expect(FLOOR_ALERT_TRIAGE_BATCH_YAML).not.toMatch(/\bevent\./);
    });

    it('caps a batch at 100 alerts, the planner batch cap', () => {
      expect(manualInputs(batch)?.properties.alert_ids).toEqual(
        expect.objectContaining({ minItems: 1, maxItems: 100 })
      );
    });

    it('loads the alert documents by id before anything else reads them', () => {
      expect(stepByName('load_alerts')).toEqual(
        expect.objectContaining({
          type: 'alertzero.triage.loadAlerts',
          with: { alert_ids: '${{ inputs.alert_ids }}' },
        })
      );
      const names = batchSteps.map(({ name }) => name);
      expect(names.indexOf('load_alerts')).toBeLessThan(names.indexOf('create_investigation'));
    });
  });

  describe('concurrency', () => {
    it('is a valid queue policy keyed per space with a bounded wait', () => {
      const concurrency = batch.settings?.concurrency;

      expect(ConcurrencySettingsSchema.safeParse(concurrency).success).toBe(true);
      expect(concurrency).toEqual(
        expect.objectContaining({ strategy: 'queue', max: 4, 'queue-size': 36, 'queue-ttl': '2h' })
      );
    });
  });

  describe('Alert Analysis contract (batch → Alert Analysis)', () => {
    it('passes only inputs Alert Analysis declares', () => {
      const declared = Object.keys(manualInputs(analysis)?.properties ?? {});
      const passed = Object.keys(
        (stepByName('classify_alerts').with?.inputs as Record<string, unknown>) ?? {}
      );

      expect(passed.filter((input) => !declared.includes(input))).toEqual([]);
    });

    it('hands it the loaded documents, with auto-close off and the Worker path on', () => {
      expect(stepByName('classify_alerts').with).toEqual(
        expect.objectContaining({
          'workflow-id': 'system-security-alert-analysis',
          inputs: expect.objectContaining({
            alerts: '${{ steps.load_alerts.output.alerts }}',
            autoCloseEnabled: false,
            calledByWorker: true,
            autoCloseConfidenceScoreMinThreshold: '${{ inputs.confidence_floor }}',
          }),
        })
      );
    });
  });

  describe('Alert Analysis standalone backwards compatibility', () => {
    it('declares no required input, so the alert-trigger path runs with today’s inputs only', () => {
      expect(manualInputs(analysis)?.required).toBeUndefined();
    });
  });

  describe('closure review contract (batch → review)', () => {
    it('passes every input the review requires and nothing it does not declare', () => {
      const reviewInputs = manualInputs(review);
      const passed = Object.keys(
        (stepByName('start_fp_review').with?.inputs as Record<string, unknown>) ?? {}
      );

      expect(passed.filter((input) => !(input in (reviewInputs?.properties ?? {})))).toEqual([]);
      expect((reviewInputs?.required ?? []).filter((input) => !passed.includes(input))).toEqual([]);
    });

    it('starts the review asynchronously and takes the rule and floor from its own inputs', () => {
      const step = stepByName('start_fp_review');

      expect(step.type).toBe('workflow.executeAsync');
      expect(step.with?.inputs).toEqual(
        expect.objectContaining({
          rule_id: '{{ inputs.rule_id }}',
          rule_name: '{{ inputs.rule_name }}',
          confidence_floor: '${{ inputs.confidence_floor }}',
          autonomy: '{{ inputs.autonomy }}',
        })
      );
    });
  });

  describe('claim release', () => {
    const tagsOf = (name: string) =>
      (stepByName(name).with?.tags as { tags_to_add?: string[]; tags_to_remove?: string[] }) ?? {};
    const RELEASE = ['az:triage_pending', 'az:triage_exec:{{ execution.id }}'];

    it.each([
      'set_az_true_positive_tags_call',
      'set_az_false_positive_tags_call',
      'set_az_inconclusive_tags_call',
    ])('%s removes the claim in the same update that writes the verdict tag', (name) => {
      expect(tagsOf(name).tags_to_remove).toEqual(expect.arrayContaining(RELEASE));
    });

    it.each([
      'release_claims_no_alerts',
      'release_claims_analysis_disabled',
      'release_claims_classify_failed',
      'release_unverdicted_claims_call',
    ])('%s marks the alerts failed and removes the claim, so no sweep retries them', (name) => {
      expect(tagsOf(name).tags_to_add).toEqual(['az:triage_failed']);
      expect(tagsOf(name).tags_to_remove).toEqual(RELEASE);
    });

    it('bounds the analysis hop to one retry before it marks the alerts failed', () => {
      const onFailure = (
        stepByName('classify_alerts') as unknown as {
          'on-failure': { retry: { 'max-attempts': number } };
        }
      )['on-failure'];

      expect(onFailure.retry['max-attempts']).toBe(2);
    });
  });
});
