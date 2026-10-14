/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW } from './hunt_continuous_threat_hunt';
import { WorkflowSchema } from '../../../spec/schema';

interface YamlStep {
  name: string;
  type: string;
  condition?: string;
  'on-failure'?: { continue?: boolean };
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
}

interface YamlWorkflow {
  steps: YamlStep[];
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

describe('AlertZero continuous threat hunt worker', () => {
  const yaml = ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.yamlTemplate({
    settingsVersion: 1,
    autonomyLevel: 'manual',
  });
  const parsed = parse(yaml) as YamlWorkflow;
  const allSteps = flatten(parsed.steps);
  const stepByName = (name: string) => allSteps.find((step) => step.name === name);
  const readiness = stepByName('check_threat_intel_readiness');
  const gate = stepByName('readiness_gate');
  const fuelGate = stepByName('fuel_gate');
  const statsGate = stepByName('stats_gate');

  it('renders with no unreplaced __TOKEN__', () => {
    expect(yaml.match(/__[A-Z][A-Z0-9_]*__/g)).toBeNull();
  });

  it('parses against WorkflowSchema', () => {
    const result = WorkflowSchema.safeParse(parsed);

    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it('has a kibana.request readiness step using GET', () => {
    expect([readiness?.type, readiness?.with?.method]).toEqual(['kibana.request', 'GET']);
  });

  it('space-scopes the readiness path', () => {
    expect(readiness?.with?.path).toBe('/s/{{ workflow.spaceId }}/internal/threat_intel/readiness');
  });

  it('continues on readiness request failure', () => {
    expect(readiness?.['on-failure']).toEqual({ continue: true });
  });

  it('sends elastic-api-version 1', () => {
    expect(
      (readiness?.with?.headers as Record<string, string> | undefined)?.['elastic-api-version']
    ).toBe('1');
  });

  it('gates readiness on request success and non-blocked status', () => {
    expect(gate?.condition).toContain("status != 'blocked'");
  });

  it('does not gate readiness on usableReportCount', () => {
    expect(gate?.condition).not.toContain('usableReportCount');
  });

  it('fails the run with workflow.fail hunt_not_ready in the else branch', () => {
    expect(gate?.else?.map(({ name, type }) => [name, type])).toEqual([
      ['hunt_not_ready', 'workflow.fail'],
    ]);
  });

  it('gates hunt_ready on usableReportCount', () => {
    expect(fuelGate?.condition).toContain('usableReportCount > 0');
  });

  it('logs hunt_ready with a console step when hunt-usable reports exist', () => {
    expect(fuelGate?.steps?.map(({ name, type }) => [name, type])).toEqual([
      ['hunt_ready', 'console'],
    ]);
  });

  it('checks usable_stats_unavailable before treating zero reports as idle', () => {
    expect(statsGate?.condition).toContain("contains 'usable_stats_unavailable'");
  });

  it('fails the run with hunt_stats_unavailable when the hunt-usable count could not be read', () => {
    expect(statsGate?.steps?.map(({ name, type }) => [name, type])).toEqual([
      ['hunt_stats_unavailable', 'workflow.fail'],
    ]);
  });

  it('logs hunt_idle with a console step, not a failure, when readiness read zero hunt-usable reports', () => {
    expect(statsGate?.else?.map(({ name, type }) => [name, type])).toEqual([
      ['hunt_idle', 'console'],
    ]);
  });

  it('nests the stats gate under the zero-report branch of fuel_gate', () => {
    expect(fuelGate?.else?.map(({ name }) => name)).toEqual(['stats_gate']);
  });

  it('has no hunting steps', () => {
    expect(
      allSteps.filter(
        ({ type }) =>
          type === 'workflow.execute' || type.startsWith('ai.') || type.startsWith('elasticsearch.')
      )
    ).toEqual([]);
  });
});
