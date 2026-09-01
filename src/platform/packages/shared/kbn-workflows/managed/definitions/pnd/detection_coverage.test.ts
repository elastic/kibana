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
  PND_DETECTION_COVERAGE_WORKFLOW,
  PND_DETECTION_COVERAGE_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW,
} from '.';

/**
 * The verdicts the detection-coverage skill may return. Duplicated here as a literal on
 * purpose: this package must not import from a Security-solution plugin. The security
 * plugin asserts the same list against its own `DETECTION_COVERAGE_VERDICTS` constant, so
 * a change on either side fails a test rather than silently diverging.
 */
const VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
] as const;

/** Verdicts that must have a dedicated switch case, i.e. an automated action path. */
const ACTIONABLE_VERDICTS = ['no_coverage', 'covered_disabled', 'prebuilt_available'] as const;

const getYaml = (
  definition: typeof PND_DETECTION_COVERAGE_WORKFLOW | typeof PND_WATCH_DETECTION_WORKFLOW
): string => {
  if ('yaml' in definition && definition.yaml) return definition.yaml;
  return definition.yamlTemplate({ settingsVersion: 1, autonomyLevel: 'manual' });
};

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean };
}

const workerDefinition = parse(getYaml(PND_DETECTION_COVERAGE_WORKFLOW)) as {
  steps: YamlStep[];
  outputs?: Array<{ name: string }>;
  triggers?: Array<{ type: string }>;
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten(step.else ?? []),
    ...flatten(step.default ?? []),
    ...(step.cases ?? []).flatMap((c) => flatten(c.steps)),
  ]);

const allWorkerSteps = flatten(workerDefinition.steps);
const stepByName = (name: string) => allWorkerSteps.find((step) => step.name === name);
const verdictSwitch = stepByName('handle_verdict');

describe('Detection Coverage worker', () => {
  it('is registered as a worker, not a catalog watch', () => {
    expect(PND_DETECTION_COVERAGE_WORKFLOW.id).toBe(PND_DETECTION_COVERAGE_WORKFLOW_ID);
    // Workers carry no `watch` selector, so they stay out of the Watch catalog.
    expect(PND_DETECTION_COVERAGE_WORKFLOW.visibility?.selectors).toBeUndefined();
  });

  it('is reachable from the Detection Watch gap branch', () => {
    const watch = parse(getYaml(PND_WATCH_DETECTION_WORKFLOW)) as { steps: YamlStep[] };
    const dispatch = flatten(watch.steps).find(
      (step) => step.type === 'workflow.execute' && step.name === 'run_coverage'
    );
    expect(dispatch?.with?.['workflow-id']).toBe(PND_DETECTION_COVERAGE_WORKFLOW_ID);
  });

  describe('verdict enum drift', () => {
    it('declares exactly the canonical verdicts in the agent output schema', () => {
      const schema = stepByName('coverage_check')?.with?.schema as {
        properties?: { verdict?: { enum?: string[] } };
        required?: string[];
      };
      expect(schema?.properties?.verdict?.enum).toEqual([...VERDICTS]);
      // Without `verdict` required, a silent omission would fall through to report-only.
      expect(schema?.required).toContain('verdict');
    });

    it('has one switch case per actionable verdict and no stray cases', () => {
      const matches = (verdictSwitch?.cases ?? []).map((c) => c.match);
      expect(new Set(matches)).toEqual(new Set(ACTIONABLE_VERDICTS));
      expect(matches).toHaveLength(ACTIONABLE_VERDICTS.length);
    });

    it('routes every remaining verdict to a report-only default arm', () => {
      const uncased = VERDICTS.filter(
        (verdict) => !(ACTIONABLE_VERDICTS as readonly string[]).includes(verdict)
      );
      expect(uncased).toEqual(['covered_enabled']);
      expect((verdictSwitch?.default ?? []).map((step) => step.name)).toEqual(['report_only']);
    });

    it('switches on the verdict itself, so a missing verdict cannot match a case', () => {
      expect(verdictSwitch?.type).toBe('switch');
      expect((verdictSwitch as unknown as { expression?: string }).expression).toContain(
        'structured_output.verdict'
      );
    });
  });

  describe('failure containment', () => {
    // A step that dies takes the run with it, so the human never learns what happened.
    // Every step that calls out must let the run reach `emit_result` and report the truth.
    it.each(['coverage_check', 'enable_existing_rule', 'install_prebuilt_rule'])(
      '%s continues on failure so the run still reports',
      (name) => {
        expect(stepByName(name)?.['on-failure']?.continue).toBe(true);
      }
    );

    it('gates every mutation behind an approval response', () => {
      for (const [action, gate] of [
        ['enable_existing_rule', 'review_enable'],
        ['install_prebuilt_rule', 'review_install'],
      ] as const) {
        const condition = (stepByName(action) as unknown as { if?: string })?.if ?? '';
        expect(condition).toContain(`steps.${gate}.output.response.approved == true`);
      }
    });
  });

  describe('outcome flags', () => {
    const emit = stepByName('emit_result')?.with as Record<string, string> | undefined;

    // A step whose `if` was false is skipped, and a skipped step has no error. Deriving a
    // flag from `error == null` therefore reports success for work that never ran, e.g. an
    // approved action whose guard then declined it. Every flag must assert evidence from
    // the API response.
    it.each([
      ['rule_enabled', 'steps.enable_existing_rule.output.enabled == true'],
      ['rule_installed', 'steps.install_prebuilt_rule.output.summary.succeeded > 0'],
    ])('%s asserts mutation evidence, not the absence of an error', (flag, expression) => {
      expect(emit?.[flag]).toContain(expression);
      expect(emit?.[flag]).not.toContain('error == null');
    });

    // One field per action rather than one combined flag: an `or` chain across steps that
    // did not run in this branch evaluates to null and swallows the true case.
    it.each([
      ['enable_approved_not_applied', 'review_enable', 'enable_existing_rule'],
      ['install_approved_not_applied', 'review_install', 'install_prebuilt_rule'],
    ])('%s flags an approval the guards did not honour', (flag, gate, action) => {
      expect(emit?.[flag]).toContain(`steps.${gate}.output.response.approved == true`);
      expect(emit?.[flag]).toContain(`steps.${action}.output`);
    });

    it('separates "no decision made" from "no gap found"', () => {
      expect(emit?.check_error).toContain('produced no verdict');
    });

    it('propagates the creation worker outcome', () => {
      expect(emit?.rule_created).toContain('steps.run_rule_creation.output.created');
      expect(emit?.created_rule_name).toContain('steps.run_rule_creation.output.rule_name');
    });
  });

  describe('preconditions and unsupported paths', () => {
    it('caps every free-text input before it reaches the model', () => {
      const triggers = (
        workerDefinition as unknown as {
          triggers?: Array<{
            inputs?: { properties?: Record<string, { type?: string; maxLength?: number }> };
          }>;
        }
      ).triggers;
      const props = triggers?.[0]?.inputs?.properties;
      expect(Object.keys(props ?? {}).length).toBeGreaterThan(0);
      // Report every offender at once, and name it: an uncapped field is the one that
      // reaches the model with an unbounded prompt.
      const uncapped = Object.entries(props ?? {})
        .filter(([, schema]) => schema.type === 'string' && !schema.maxLength)
        .map(([name]) => name);
      expect(uncapped).toEqual([]);
    });
  });

  it('reports an outcome flag for every action path', () => {
    const outputs = (workerDefinition.outputs ?? []).map((output) => output.name);
    expect(outputs).toEqual(
      expect.arrayContaining(['verdict', 'existing_rule', 'rule_enabled', 'rule_installed'])
    );
  });
});
