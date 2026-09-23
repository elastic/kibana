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
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';

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

/** Verdicts that must have a dedicated switch case. */
const ACTIONABLE_VERDICTS = [
  'no_coverage',
  'covered_disabled',
  'prebuilt_available',
  'covered_enabled',
] as const;

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean };
  if?: string;
}

const reviewDefinition = parse(ALERTZERO_COVERAGE_REVIEW_WORKFLOW.yaml) as {
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

const allReviewSteps = flatten(reviewDefinition.steps);
const stepByName = (name: string) => allReviewSteps.find((step) => step.name === name);
const verdictSwitch = stepByName('handle_verdict');

const creationDefinition = parse(ALERTZERO_RULE_CREATION_WORKFLOW.yaml) as {
  steps: YamlStep[];
  outputs?: Array<{ name: string }>;
};
const creationEmit = flatten(creationDefinition.steps).find((step) => step.name === 'emit_result')
  ?.with as Record<string, string> | undefined;

const evaluateExpression = (expression: string, context: Record<string, unknown>): unknown => {
  const trimmed = expression.trim();
  if (!(trimmed.startsWith('${{') && trimmed.endsWith('}}'))) {
    throw new Error(`Expected \${{ }} expression, got: ${expression}`);
  }
  return createWorkflowLiquidEngine().evalValueSync(trimmed.slice(3, -2).trim(), context);
};

const appliedOutcome = {
  enable_approved_not_applied: false,
  install_approved_not_applied: false,
  installed_not_enabled: false,
};

const creationUnreviewedTemplate = (): string => {
  const outcome = stepByName('resolve_outcome')?.with as Record<string, string> | undefined;
  return outcome?.creation_unreviewed ?? '';
};

const evaluateMarkProcessed = ({
  verdict = 'no_coverage',
  created = false,
  reviewed,
  error = null,
}: {
  verdict?: string | null;
  created?: boolean;
  reviewed?: boolean;
  error?: unknown;
}): unknown => {
  const childContext = {
    steps: {
      coverage_check: { output: { structured_output: { verdict } } },
      run_rule_creation: { error, output: { created, reviewed } },
    },
  };
  const creationUnreviewed = evaluateExpression(creationUnreviewedTemplate(), childContext);
  return evaluateExpression(stepByName('mark_processed')?.if ?? '', {
    steps: {
      ...childContext.steps,
      resolve_outcome: { output: { ...appliedOutcome, creation_unreviewed: creationUnreviewed } },
    },
  });
};

describe('Detection Coverage review', () => {
  it('is registered as a review workflow, not a catalog watch', () => {
    expect(ALERTZERO_COVERAGE_REVIEW_WORKFLOW.id).toBe(ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID);
    // The review has no `visibility.selectors`, so the Watch catalog does not list it.
    expect(
      (ALERTZERO_COVERAGE_REVIEW_WORKFLOW as { visibility?: { selectors?: unknown } }).visibility
        ?.selectors
    ).toBeUndefined();
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

    it('routes every remaining verdict to the report-only default branch', () => {
      const uncased = VERDICTS.filter(
        (verdict) => !(ACTIONABLE_VERDICTS as readonly string[]).includes(verdict)
      );
      // Every canonical verdict has its own case. The default branch handles only
      // unexpected verdicts, such as a model answer outside the enum.
      expect(uncased).toEqual([]);
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
    // The check runs only when the read found the indicator. A missing indicator must
    // not cost a model call, and it must not open an approval.
    it('runs the coverage check only when the indicator was found', () => {
      expect(stepByName('coverage_check')?.if).toContain(
        'steps.read_ki.output.hits.total.value > 0'
      );
    });

    // A step that dies takes the run with it, so the human never learns what happened.
    // Every step that calls out must let the run reach `emit_result` and report the truth.
    it.each([
      'coverage_check',
      'enable_existing_rule',
      'install_prebuilt_rule',
      'run_rule_creation',
    ])('%s continues on failure so the run still reports', (name) => {
      expect(stepByName(name)?.['on-failure']?.continue).toBe(true);
    });

    it('gates every mutation behind an approval response', () => {
      for (const [action, gate] of [
        ['enable_existing_rule', 'review_enable'],
        ['install_prebuilt_rule', 'review_install'],
      ] as const) {
        const condition = stepByName(action)?.if ?? '';
        expect(condition).toContain(`steps.${gate}.output.response.approved == true`);
      }
    });

    // An approval that times out must fail the run before `mark_processed`. Then an
    // unanswered indicator stays pending, and the next sweep starts a new review.
    it.each(['review_enable', 'review_install', 'confirm_coverage', 'report_only'])(
      '%s does not continue on failure, so a timeout leaves the indicator pending',
      (name) => {
        expect(stepByName(name)?.['on-failure']?.continue).toBeUndefined();
      }
    );

    // The indicator leaves the queue only after an applied decision. No verdict means no
    // approval was asked. A failed rule-creation run decided nothing. A rule-creation run
    // that asked nobody also decided nothing. An approved enable or install that changed
    // nothing did not apply the decision. Each case must leave the indicator pending.
    it('marks the indicator processed only after an applied decision', () => {
      const condition = stepByName('mark_processed')?.if ?? '';
      expect(condition).toContain('structured_output.verdict != null');
      expect(condition).toContain("structured_output.verdict != ''");
      expect(condition).toContain('steps.run_rule_creation.error == null');
      // `error == null` is true when the child skipped the human gate. Step `if` cannot
      // group with parentheses, so `creation_unreviewed` from `resolve_outcome` carries
      // the no_coverage review test.
      expect(condition).toContain('steps.resolve_outcome.output.creation_unreviewed == false');
      for (const flag of [
        'enable_approved_not_applied',
        'install_approved_not_applied',
        'installed_not_enabled',
      ]) {
        expect(condition).toContain(`steps.resolve_outcome.output.${flag} == false`);
      }
    });

    // The child can complete with `created: false` without asking anyone when the draft
    // has an empty query or no attachment. That must not drop the indicator.
    it('leaves the indicator pending when rule creation completes with created: false and no review', () => {
      expect(evaluateMarkProcessed({ created: false, reviewed: false })).toBe(false);
    });

    it.each([
      ['dismisses the draft', { created: false, reviewed: true }, true],
      ['creates the rule', { created: true, reviewed: true }, true],
      [
        'fails the child run',
        { created: false, reviewed: false, error: { message: 'boom' } },
        false,
      ],
    ])('on no_coverage, mark_processed after the child %s', (_scenario, child, expected) => {
      expect(evaluateMarkProcessed(child)).toBe(expected);
    });

    it('still marks other verdicts processed when the rule-creation child did not run', () => {
      expect(evaluateMarkProcessed({ verdict: 'covered_disabled' })).toBe(true);
    });

    // `error` is null for a step its own `if` skipped, for a step in a branch that never
    // ran, and for an enable whose query matched no rule. Gating the queue write on the
    // absence of an error therefore drops an indicator whose approved action never
    // applied. The three API-response flags are the only admissible evidence.
    it.each(['enable_existing_rule', 'install_prebuilt_rule', 'enable_installed_rule'])(
      'does not treat a missing %s error as evidence the action applied',
      (action) => {
        expect(stepByName('mark_processed')?.if ?? '').not.toContain(`steps.${action}.error`);
      }
    );

    // The review runs in the space of the sweep that started it. A link without the
    // space prefix opens the default space.
    it('links every approval message to the conversation in the current space', () => {
      const approvals = allReviewSteps.filter((step) => step.type === 'waitForApproval');
      expect(approvals).toHaveLength(4);
      for (const approval of approvals) {
        expect(String(approval.with?.message)).toContain(
          '/s/{{ workflow.spaceId }}/app/agent_builder/conversations/'
        );
      }
    });
  });

  describe('outcome flags', () => {
    const emit = stepByName('emit_result')?.with as Record<string, string> | undefined;
    const outcome = stepByName('resolve_outcome')?.with as Record<string, string> | undefined;

    // A step whose `if` was false is skipped, and a skipped step has no error. Deriving a
    // flag from `error == null` therefore reports success for work that never ran, e.g. an
    // approved action whose guard then declined it. Every flag must assert evidence from
    // the API response.
    it.each([
      ['rule_enabled', 'steps.enable_existing_rule.output.succeeded > 0'],
      ['rule_installed', 'steps.install_prebuilt_rule.output.summary.succeeded > 0'],
    ])('%s asserts mutation evidence, not the absence of an error', (flag, expression) => {
      expect(emit?.[flag]).toContain(expression);
      expect(emit?.[flag]).not.toContain('error == null');
    });

    // One field per action tells the caller exactly which approved operation was not applied.
    it.each([
      ['enable_approved_not_applied', 'review_enable', 'enable_existing_rule'],
      ['install_approved_not_applied', 'review_install', 'install_prebuilt_rule'],
    ])('%s flags an approval the guards did not honour', (flag, gate, action) => {
      expect(outcome?.[flag]).toContain(`steps.${gate}.output.response.approved == true`);
      expect(outcome?.[flag]).toContain(`steps.${action}.output`);
      expect(outcome?.[flag]).not.toContain('error == null');
    });

    // One source for the queue write and the report. If they were computed separately, a
    // run could report "approved but not applied" and still drop the indicator.
    it.each([
      'enable_approved_not_applied',
      'install_approved_not_applied',
      'installed_not_enabled',
    ])('%s is computed once and forwarded to the output', (flag) => {
      expect(outcome?.[flag]).toBeDefined();
      expect(emit?.[flag]).toBe(`\${{ steps.resolve_outcome.output.${flag} }}`);
      expect(stepByName('mark_processed')?.if ?? '').toContain(
        `steps.resolve_outcome.output.${flag} == false`
      );
    });

    it('computes creation_unreviewed from the child reviewed output', () => {
      expect(outcome?.creation_unreviewed).toContain("verdict == 'no_coverage'");
      expect(outcome?.creation_unreviewed).toContain(
        'steps.run_rule_creation.output.reviewed != true'
      );
      expect(stepByName('mark_processed')?.if ?? '').toContain(
        'steps.resolve_outcome.output.creation_unreviewed == false'
      );
    });

    it('treats an installation skipped because the rule is already present as available', () => {
      expect(outcome?.install_approved_not_applied).toContain(
        'steps.install_prebuilt_rule.output.summary.skipped > 0'
      );
      expect(outcome?.installed_not_enabled).toContain(
        'steps.install_prebuilt_rule.output.summary.succeeded > 0'
      );
      expect(outcome?.installed_not_enabled).toContain(
        'steps.install_prebuilt_rule.output.summary.skipped > 0'
      );
      expect(outcome?.installed_not_enabled).toContain(
        'not (steps.enable_installed_rule.output.succeeded > 0'
      );
    });

    it('reports whether the analyst confirmed an enabled rule covers the gap', () => {
      expect(emit?.coverage_confirmed).toContain(
        'steps.confirm_coverage.output.response.approved == true'
      );
    });

    // Two different failures need two different messages. "Not found" means the producer
    // or the index is wrong. "No verdict" means the check itself failed.
    it('tells a missing indicator apart from a check that returned no verdict', () => {
      expect(emit?.check_error).toContain('steps.read_ki.output.hits.total.value == 0');
      expect(emit?.check_error).toContain('knowledge indicator not found');
      expect(emit?.check_error).toContain('produced no verdict');
    });

    // A failed rule-creation child leaves the indicator pending and the run completed; without
    // this field nothing in the run says why the indicator came back.
    it('reports a failed rule-creation child', () => {
      expect(emit?.creation_error).toContain('steps.run_rule_creation.error != null');
      expect(emit?.creation_error).toContain('rule creation failed');
    });

    it('propagates the creation worker outcome', () => {
      expect(emit?.rule_created).toContain('steps.run_rule_creation.output.created');
      expect(emit?.created_rule_name).toContain('steps.run_rule_creation.output.rule_name');
    });

    it('reads reviewed from the creation worker, not created, so a dismissal still processes', () => {
      expect(creationDefinition.outputs?.map((output) => output.name)).toEqual(
        expect.arrayContaining(['created', 'reviewed', 'rule_name'])
      );
      expect(creationEmit?.reviewed).toContain(
        'steps.review_creation.output.response.approved == true'
      );
      expect(creationEmit?.reviewed).toContain(
        'steps.review_creation.output.response.approved == false'
      );
      expect(
        evaluateExpression(creationEmit?.reviewed ?? '', {
          steps: { review_creation: { output: { response: { approved: false } } } },
        })
      ).toBe(true);
      expect(
        evaluateExpression(creationEmit?.reviewed ?? '', {
          steps: { review_creation: { output: {} } },
        })
      ).toBe(false);
    });
  });

  describe('inputs', () => {
    it('limits the length of every string input', () => {
      const triggers = (
        reviewDefinition as unknown as {
          triggers?: Array<{
            inputs?: { properties?: Record<string, { type?: string; maxLength?: number }> };
          }>;
        }
      ).triggers;
      const props = triggers?.[0]?.inputs?.properties;
      expect(Object.keys(props ?? {}).length).toBeGreaterThan(0);
      // Report every offender at once, by name.
      const uncapped = Object.entries(props ?? {})
        .filter(([, schema]) => schema.type === 'string' && !schema.maxLength)
        .map(([name]) => name);
      expect(uncapped).toEqual([]);
    });
  });

  it('reports an outcome flag for every action path', () => {
    const outputs = (reviewDefinition.outputs ?? []).map((output) => output.name);
    expect(outputs).toEqual(
      expect.arrayContaining([
        'verdict',
        'existing_rule',
        'coverage_confirmed',
        'rule_enabled',
        'rule_installed',
        'installed_not_enabled',
      ])
    );
  });
});
