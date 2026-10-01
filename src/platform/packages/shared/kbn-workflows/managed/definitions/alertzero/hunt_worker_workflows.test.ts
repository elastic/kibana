/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_HUNT_WORKFLOW,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW,
} from '.';

// Route-path and cross-package id checks (including the SYSTEM_SECURITY_HUNT_*
// cross-check) live in the alertzero PLUGIN's own hunt_children_contract.test.ts, not
// here: this package (kbn-workflows) is a generic platform package with no dependency on
// @kbn/alertzero-common (a security-solution-specific package; no other file in
// kbn-workflows imports runtime values from it, and adding one here is the wrong
// direction -- solution packages depend on platform packages, not the reverse). The
// plugin's test already safely imports both @kbn/workflows/managed and
// @kbn/alertzero-common, so that is where a real (non-mirrored) check against those
// constants belongs.

// The raw `parse(yaml)` tree, not WorkflowSchema's parsed output -- see
// attack_discovery_workflows.test.ts's identical note: the schema types nested step
// arrays as z.array(BaseStepSchema), which strips `with`/`tags`/`triggers` fields the
// schema itself doesn't define, so asserting against the schema's output would read
// `undefined` for everything this file checks.
interface TriggerInputProperty {
  type?: string;
  properties?: Record<string, unknown>;
}

interface TriggerInputSchema {
  properties?: Record<string, TriggerInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

interface YamlStep {
  name: string;
  type?: string;
  with?: { 'workflow-id'?: string; inputs?: Record<string, unknown>; path?: string };
  steps?: YamlStep[];
}

interface YamlWorkflow {
  tags?: string[];
  triggers?: Array<{ type: string; inputs?: TriggerInputSchema }>;
  steps: YamlStep[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

const worker = parse(
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.yamlTemplate({
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '4h',
  })
) as YamlWorkflow;
const findOrCreateInvestigation = parse(
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW.yaml
) as YamlWorkflow;
const hunt = parse(ALERTZERO_HUNT_WORKFLOW.yaml) as YamlWorkflow;
const packageReport = parse(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.yaml) as YamlWorkflow;
const proposalGate = parse(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.yaml) as YamlWorkflow;

const workerSteps = flatten(worker.steps);
const packageReportSteps = flatten(packageReport.steps);

const stepIn = (steps: YamlStep[], name: string) => steps.find((step) => step.name === name);

describe('Hunt Watch worker chain', () => {
  // 1b: the two feature children carry exactly the shared tag pair, and neither the
  // Worker-only watch tags.
  it.each([
    ['hunt_package_report', packageReport],
    ['hunt_proposal_gate', proposalGate],
  ])('%s is tagged exactly security + continuous-threat-hunt', (_name, yaml) => {
    expect(new Set(yaml.tags ?? [])).toEqual(new Set(['security', 'continuous-threat-hunt']));
  });

  it.each([
    ['hunt_package_report', packageReport],
    ['hunt_proposal_gate', proposalGate],
  ])('%s carries neither watch nor watch-hunt', (_name, yaml) => {
    expect(yaml.tags ?? []).not.toContain('watch');
    expect(yaml.tags ?? []).not.toContain('watch-hunt');
  });

  // The existing-Proposals guard's lookup (decide_and_package) is only race-safe once two
  // runs against the same Investigation cannot execute concurrently — queued, not dropped,
  // so a racing run still packages rather than being silently lost.
  it('hunt_package_report serializes per Investigation via a queued concurrency key', () => {
    expect(packageReport.settings?.concurrency).toEqual({
      key: 'hunt-package-report-{{ inputs.investigationConversationId }}',
      strategy: 'queue',
      max: 1,
    });
  });

  // 1e: each child's own declared trigger input schema is what the caller's payload is
  // checked against -- not a hand-typed copy of it that could drift from the real schema.
  describe('call-site inputs satisfy the declared child schema', () => {
    const requiredInputsOf = (child: YamlWorkflow): string[] =>
      child.triggers?.[0]?.inputs?.required ?? [];
    const declaredPropertiesOf = (child: YamlWorkflow): string[] =>
      Object.keys(child.triggers?.[0]?.inputs?.properties ?? {});
    const isClosed = (child: YamlWorkflow): boolean =>
      child.triggers?.[0]?.inputs?.additionalProperties === false;

    const assertSatisfies = (child: YamlWorkflow, callSiteInputs: Record<string, unknown>) => {
      const provided = Object.keys(callSiteInputs);
      const required = requiredInputsOf(child);
      const declared = declaredPropertiesOf(child);

      expect(required.filter((key) => !provided.includes(key))).toEqual([]);
      if (isClosed(child)) {
        expect(provided.filter((key) => !declared.includes(key))).toEqual([]);
      }
    };

    it('find_or_create_investigation call site', () => {
      assertSatisfies(
        findOrCreateInvestigation,
        stepIn(workerSteps, 'find_or_create_investigation')?.with?.inputs ?? {}
      );
    });

    it('hunt call site', () => {
      assertSatisfies(hunt, stepIn(workerSteps, 'hunt')?.with?.inputs ?? {});
    });

    it('package_report call site', () => {
      assertSatisfies(packageReport, stepIn(workerSteps, 'package_report')?.with?.inputs ?? {});
    });

    it('proposal_gate call site', () => {
      const dispatch = stepIn(
        flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
        'dispatch_gate'
      );

      assertSatisfies(proposalGate, dispatch?.with?.inputs ?? {});
    });
  });

  // 1c/1d: uniqueness and workflow.execute-id resolution across the WHOLE registry are
  // proven in managed_workflow_definitions.test.ts ("registers all four hunt child ids
  // exactly once", "resolves every workflow.execute/executeAsync id the Worker's
  // rendered YAML references"); this just pins the ids these five files actually
  // resolve to, so a rename on one side (a child's own id constant) without the other
  // (the caller's workflow-id string) fails here instead of at runtime.
  it.each([
    ['find_or_create_investigation', ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW.id],
    ['hunt', ALERTZERO_HUNT_WORKFLOW.id],
    ['package_report', ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.id],
  ] as const)('the Worker dispatches %s by its registered id', (stepName, id) => {
    expect(stepIn(workerSteps, stepName)?.with?.['workflow-id']).toBe(id);
  });

  it('the packaging child dispatches the gate by its registered id', () => {
    const dispatch = stepIn(
      flatten(stepIn(packageReportSteps, 'start_proposal_gates')?.steps ?? []),
      'dispatch_gate'
    );

    expect(dispatch?.with?.['workflow-id']).toBe(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.id);
  });
});
