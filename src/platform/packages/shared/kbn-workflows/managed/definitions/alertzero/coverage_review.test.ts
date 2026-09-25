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
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { CREATE_PROPOSAL_WORKFLOW } from '../proposals';

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

/** Every canonical verdict has its own switch case with exactly these steps, in order. */
const CASE_STEPS = {
  no_coverage: ['run_rule_creation'],
  covered_disabled: ['propose_enable', 'report_unresolved_rule'],
  prebuilt_available: ['install_target', 'propose_install', 'report_missing_version'],
  covered_enabled: ['propose_confirm'],
} as const;

/** Every step that runs the proposal gate, in switch order. */
const PROPOSAL_STEPS = [
  'propose_enable',
  'report_unresolved_rule',
  'propose_install',
  'report_missing_version',
  'propose_confirm',
  'report_unknown_verdict',
];

const REPORT_STEPS = PROPOSAL_STEPS.filter((name) => name.startsWith('report_'));

const APPLIED_FLAGS = ['enable_approved_not_applied', 'install_approved_not_applied'] as const;

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  expression?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean };
}

interface YamlWorkflow {
  settings?: { timeout?: string };
  steps: YamlStep[];
  outputs?: Array<{ name: string }>;
  triggers?: Array<{
    type: string;
    inputs?: { properties?: Record<string, { type?: string; maxLength?: number }> };
  }>;
}

const reviewDefinition = parse(ALERTZERO_COVERAGE_REVIEW_WORKFLOW.yaml) as YamlWorkflow;
const gateDefinition = parse(CREATE_PROPOSAL_WORKFLOW.yaml) as YamlWorkflow;
const creationDefinition = parse(ALERTZERO_RULE_CREATION_WORKFLOW.yaml) as YamlWorkflow;

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten(step.else ?? []),
    ...(step.cases ?? []).flatMap((c) => flatten(c.steps)),
    ...flatten(step.default ?? []),
  ]);

const allReviewSteps = flatten(reviewDefinition.steps);
const verdictSwitch = reviewDefinition.steps.find((step) => step.name === 'handle_verdict');
const stepByName = (name: string) => allReviewSteps.find((step) => step.name === name);
const stepIndex = (name: string) => allReviewSteps.findIndex((step) => step.name === name);
const inputsOf = (step: YamlStep | undefined) =>
  (step?.with?.inputs ?? {}) as Record<string, unknown>;
const hours = (timeout: unknown) => Number(String(timeout).replace(/h$/, ''));
const withOf = (name: string) => stepByName(name)?.with as Record<string, string> | undefined;
const caseOf = (match: string) =>
  verdictSwitch?.cases?.find((c) => c.match === match)?.steps.map(({ name }) => name);
const routeOf = (name: string) => stepByName(name)?.if ?? '';

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
};

/**
 * Evaluates `mark_processed`'s condition the way the engine would: the compound flags
 * come from `resolve_outcome`, computed here from the same templates.
 */
const evaluateMarkProcessed = ({
  verdict = 'no_coverage',
  created = false,
  reviewed,
  error = null,
  approved = false,
  dismissed = false,
}: {
  verdict?: string | null;
  created?: boolean;
  reviewed?: boolean;
  error?: unknown;
  approved?: boolean;
  dismissed?: boolean;
}): unknown => {
  const outcome = withOf('resolve_outcome') ?? {};
  const childContext = {
    steps: {
      coverage_check: { output: { structured_output: { verdict } } },
      run_rule_creation: { error, output: { created, reviewed } },
      record_decision: { output: { approved, dismissed } },
    },
  };
  const derived = {
    creation_unreviewed: evaluateExpression(outcome.creation_unreviewed, childContext),
    decided: evaluateExpression(outcome.decided, childContext),
  };
  return evaluateExpression(stepByName('mark_processed')?.if ?? '', {
    steps: {
      ...childContext.steps,
      resolve_outcome: { output: { ...appliedOutcome, ...derived } },
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

  describe('verdict routing', () => {
    it('declares exactly the canonical verdicts in the agent output schema', () => {
      const schema = stepByName('coverage_check')?.with?.schema as {
        properties?: { verdict?: { enum?: string[] } };
        required?: string[];
      };
      expect(schema?.properties?.verdict?.enum).toEqual([...VERDICTS]);
      // Without `verdict` required, a silent omission would fall through to report-only.
      expect(schema?.required).toContain('verdict');
    });

    it('switches on the verdict itself, so a missing verdict cannot match a case', () => {
      expect(verdictSwitch?.type).toBe('switch');
      expect(verdictSwitch?.expression).toContain('structured_output.verdict');
    });

    it('has one switch case per canonical verdict and no stray cases', () => {
      const matches = (verdictSwitch?.cases ?? []).map((c) => c.match);
      expect(new Set(matches)).toEqual(new Set(VERDICTS));
      expect(matches).toHaveLength(VERDICTS.length);
      for (const verdict of VERDICTS) {
        expect(caseOf(verdict)).toEqual(CASE_STEPS[verdict]);
      }
    });

    // Only a verdict outside the enum lands in the default. A check that produced no
    // verdict asked nobody, so it is not reported either.
    it('reports an unknown verdict from the default branch, but only a verdict', () => {
      expect((verdictSwitch?.default ?? []).map((step) => step.name)).toEqual([
        'report_unknown_verdict',
      ]);
      expect(routeOf('report_unknown_verdict')).toContain('verdict != null');
      expect(routeOf('report_unknown_verdict')).toContain("verdict != ''");
    });

    // A verdict the actions cannot honour must surface to the analyst, not vanish.
    it('offers the enable action only for a rule resolved to a saved object', () => {
      expect(routeOf('propose_enable')).toContain('steps.resolve_rule.output.id != null');
      expect(routeOf('report_unresolved_rule')).toContain('steps.resolve_rule.output.id == null');
    });

    // Only a 404 means the rule is missing. Any other lookup failure on
    // covered_disabled would otherwise reach the manual report, which an analyst can
    // acknowledge away together with the enable recommendation.
    it.each([
      [
        'covered_disabled',
        { message: 'HTTP 404: {"message":"rule_id: \\"x\\" not found"}' },
        false,
      ],
      ['covered_disabled', { message: 'HTTP 500: Internal Server Error' }, true],
      ['covered_disabled', { message: 'HTTP 403: Forbidden' }, true],
      ['covered_disabled', null, false],
      ['covered_enabled', { message: 'HTTP 500: Internal Server Error' }, false],
    ])('on %s after lookup error %j, fails the review: %s', (verdict, error, expected) => {
      expect(
        evaluateExpression(String(withOf('resolve_rule_outcome')?.failed), {
          steps: {
            coverage_check: { output: { structured_output: { verdict } } },
            resolve_rule: { error },
          },
        })
      ).toBe(expected);
    });

    // Failing before the investigation exists leaves nothing open behind a review
    // the next sweep will run again.
    it('stops on a failed lookup before an investigation is opened', () => {
      const fail = stepByName('fail_rule_lookup');
      expect(fail?.type).toBe('workflow.fail');
      expect(fail?.if).toContain('steps.resolve_rule_outcome.output.failed == true');
      expect(stepIndex('resolve_rule')).toBeLessThan(stepIndex('resolve_rule_outcome'));
      expect(stepIndex('resolve_rule_outcome')).toBeLessThan(stepIndex('fail_rule_lookup'));
      expect(stepIndex('fail_rule_lookup')).toBeLessThan(stepIndex('create_investigation'));
    });

    it('offers the install action only with a signature id and a package version', () => {
      const ready = String(withOf('install_target')?.ready);
      expect(ready).toContain("structured_output.rule_id != ''");
      expect(ready).toContain('structured_output.prebuilt_version > 0');
      expect(routeOf('propose_install')).toContain('steps.install_target.output.ready == true');
      expect(routeOf('report_missing_version')).toContain(
        'steps.install_target.output.ready != true'
      );
    });
  });

  describe('investigation', () => {
    it('resolves the saved object from the signature id before proposing', () => {
      const resolve = stepByName('resolve_rule');
      expect(resolve?.type).toBe('kibana.request');
      expect(String(resolve?.with?.path)).toContain(
        'rule_id={{ steps.coverage_check.output.structured_output.rule_id | url_encode }}'
      );
      expect(stepIndex('resolve_rule')).toBeLessThan(stepIndex('handle_verdict'));
    });

    // Without an investigation there is nowhere to propose, so a failed create must
    // fail the run rather than continue into a proposal with an empty conversation id.
    // A check without a verdict asks nobody, so it opens nothing either.
    it('opens an investigation from the template for every verdict', () => {
      const create = stepByName('create_investigation');
      expect(create?.type).toBe('ai.conversation.create');
      expect(create?.with?.template_id).toBe('investigation');
      expect(create?.if).not.toContain('no_coverage');
      expect(create?.if).toContain('verdict != null');
      expect(create?.if).toContain("verdict != ''");
      expect(create).not.toHaveProperty('on-failure');
    });

    it('describes the gap from the indicator, not from raw inputs', () => {
      const create = stepByName('create_investigation');
      expect(String(create?.with?.title)).toContain('steps.gap.output.description');
      expect(JSON.stringify(withOf('compose_evidence'))).not.toContain('inputs.gap_description');
      expect(JSON.stringify(withOf('compose_evidence'))).toContain('steps.gap.output.evidence');
    });

    it('attaches the matched rule by reference under a fixed attachment id', () => {
      const attach = stepByName('attach_rule');
      expect(attach?.type).toBe('ai.attachment.add');
      expect(attach?.with?.type).toBe('security.rule');
      expect(attach?.with?.id).toBe('coverage-rule');
      expect(attach?.with?.origin).toBe(
        '{{ steps.coverage_check.output.structured_output.rule_id }}'
      );
      expect(attach?.if).toContain('steps.resolve_rule.output.id != null');
      expect(attach?.with?.render_inline).toBe(true);
    });

    it('refreshes the attachment with the rule as it exists after the action', () => {
      const refetch = stepByName('refetch_rule');
      const refresh = stepByName('refresh_rule_attachment');
      const attachInstalled = stepByName('attach_installed_rule');

      expect(refetch?.if).toContain('steps.record_decision.output.applied == true');
      expect(String(refetch?.with?.path)).toContain(
        'id={{ steps.resolve_rule.output.id | url_encode }}'
      );
      expect(String(refetch?.with?.path)).toContain(
        'rule_id={{ steps.coverage_check.output.structured_output.rule_id | url_encode }}'
      );

      expect(refresh?.type).toBe('ai.attachment.update');
      expect(refresh?.with?.attachment_id).toBe('coverage-rule');
      expect(JSON.stringify(refresh?.with)).toContain('steps.refetch_rule.output | json');
      expect(refresh?.if).toContain('steps.refetch_rule.output.id != null');

      // A prebuilt rule has no saved object until installed, so it is attached afterwards.
      expect(attachInstalled?.type).toBe('ai.attachment.add');
      expect(attachInstalled?.if).toContain("steps.propose_install.output.status == 'succeeded'");
      expect(attachInstalled?.with?.id).toBe('coverage-rule');
      expect(attachInstalled?.with?.render_inline).toBe(true);
    });

    it('closes the investigation on a decision and leaves it open without one', () => {
      const close = stepByName('close_investigation');
      expect(close?.type).toBe('switch');
      expect(close?.if).toContain('steps.create_investigation.output.conversation_id != null');
      // No default: a run that reached no decision closes nothing.
      expect(close?.default).toBeUndefined();

      const caseSteps = (match: string) =>
        close?.cases?.find((c) => c.match === match)?.steps.map(({ name }) => name);
      expect(caseSteps('approved')).toEqual(['close_investigation_resolved']);
      expect(caseSteps('dismissed')).toEqual(['close_investigation_dismissed']);

      const resolved = stepByName('close_investigation_resolved');
      const dismissed = stepByName('close_investigation_dismissed');
      expect(resolved?.type).toBe('ai.conversation.metadata.patch');
      expect(resolved).not.toHaveProperty('if');
      expect(dismissed).not.toHaveProperty('if');
      expect((resolved?.with?.updates as Record<string, string>).status).toBe('closed');
      expect((dismissed?.with?.updates as Record<string, string>).status).toBe('closed');
    });

    // An approval whose change did not land leaves the indicator pending, so the
    // investigation must not claim the gap is resolved.
    it.each([
      ['an applied approval', { approved: true, dismissed: false }, {}, 'approved'],
      [
        'an approved enable the re-read does not confirm',
        { approved: true, dismissed: false },
        { enable_approved_not_applied: true },
        '',
      ],
      [
        'an approved install the re-read does not confirm',
        { approved: true, dismissed: false },
        { install_approved_not_applied: true },
        '',
      ],
      ['a dismissal', { approved: false, dismissed: true }, {}, 'dismissed'],
      ['an expired proposal', { approved: false, dismissed: false }, {}, ''],
    ])('routes %s to the matching close', (_scenario, decision, outcome, expected) => {
      const rendered = createWorkflowLiquidEngine().parseAndRenderSync(
        String(stepByName('close_investigation')?.expression),
        {
          steps: {
            record_decision: { output: decision },
            resolve_outcome: { output: { ...appliedOutcome, ...outcome } },
          },
        }
      );
      expect(rendered).toBe(expected);
    });

    it('verifies what landed before it closes the investigation', () => {
      expect(stepIndex('refetch_rule')).toBeLessThan(stepIndex('resolve_outcome'));
      expect(stepIndex('resolve_outcome')).toBeLessThan(stepIndex('close_investigation'));
      expect(stepIndex('close_investigation')).toBeLessThan(stepIndex('mark_processed'));
    });

    // All spaces share one indicator index.
    it('reads the indicator only from the current space', () => {
      const query = stepByName('read_ki')?.with?.query as { bool?: { filter?: unknown[] } };

      expect(query?.bool?.filter).toEqual([
        { ids: { values: ['{{ inputs.ki_id }}'] } },
        { term: { 'attributes.space_id': '{{ workflow.spaceId }}' } },
      ]);
    });

    // The review runs in the space of the sweep that started it. A link without the
    // space prefix opens the default space.
    it('links every proposal to the current space', () => {
      const evidence = withOf('compose_evidence') ?? {};
      for (const line of ['rule_line', 'investigation_line', 'check_line']) {
        expect(evidence[line]).toContain('/s/{{ workflow.spaceId }}/');
      }
    });
  });

  describe('proposal gate', () => {
    // The review has no gate of its own: the decision lives on the investigation as a
    // proposal, and the gate workflow runs the action as the approver.
    it('has no approval gate of its own', () => {
      const types = allReviewSteps.map(({ type }) => type);
      expect(types).not.toContain('waitForApproval');
      expect(types).not.toContain('waitForInput');
      expect(types).not.toContain('security.enableRule');
    });

    it('proposes through the investigation gate, one proposal per route', () => {
      const proposals = allReviewSteps.filter(
        ({ type, with: input }) =>
          type === 'workflow.execute' && input?.['workflow-id'] === CREATE_PROPOSAL_WORKFLOW.id
      );
      expect(proposals.map(({ name }) => name)).toEqual(PROPOSAL_STEPS);

      for (const proposal of proposals) {
        // A gate that fails outright must fail the run rather than read as a decision.
        expect(proposal).not.toHaveProperty('on-failure');
        expect(inputsOf(proposal).conversationId).toBe(
          '{{ steps.create_investigation.output.conversation_id }}'
        );
      }
    });

    it('runs the enable action against the resolved saved-object id', () => {
      const enable = inputsOf(stepByName('propose_enable'));
      expect(enable.actionWorkflowId).toBe(ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID);
      expect(enable.actionInput).toEqual({ id: '{{ steps.resolve_rule.output.id }}' });
      expect(enable.autoApprove).toBe(false);
    });

    // The rule has no saved object until installed, so the install action is the one
    // place the signature id is the handle.
    it('runs the install action against the signature id and package version', () => {
      const install = inputsOf(stepByName('propose_install'));
      expect(install.actionWorkflowId).toBe(ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID);
      expect(install.actionInput).toEqual({
        rule_id: '{{ steps.coverage_check.output.structured_output.rule_id }}',
        version: '${{ steps.coverage_check.output.structured_output.prebuilt_version }}',
      });
      expect(install.autoApprove).toBe(false);
    });

    // The gate types actionInput as an object, so action-less proposals omit the keys
    // rather than pass an empty value. With no action to inherit a category from, they
    // must name the same `configure` bucket the action proposals land in, or fall into
    // the uncategorized fallback.
    it.each(['propose_confirm', ...REPORT_STEPS])(
      '%s carries no action but names its category',
      (name) => {
        const inputs = inputsOf(stepByName(name));
        expect(inputs).not.toHaveProperty('actionWorkflowId');
        expect(inputs).not.toHaveProperty('actionInput');
        expect(inputs.category).toBe('configure');
      }
    );

    it.each(REPORT_STEPS)('%s renders the shared report body', (name) => {
      expect(String(inputsOf(stepByName(name)).comment)).toContain(
        '{{ steps.compose_report.output.body }}'
      );
    });

    // The creation worker runs its own proposal gate, on the investigation this
    // review opened, so the analyst sees one record for the gap.
    it('dispatches rule creation only for no_coverage, on the same investigation', () => {
      const creation = stepByName('run_rule_creation');
      expect(creation?.type).toBe('workflow.execute');
      expect(creation?.with?.['workflow-id']).toBe(ALERTZERO_RULE_CREATION_WORKFLOW_ID);
      expect(creation?.['on-failure']?.continue).toBe(true);
      expect(inputsOf(creation).gap_description).toBe('{{ steps.gap.output.description }}');
      expect(inputsOf(creation).investigation_id).toBe(
        '{{ steps.create_investigation.output.conversation_id }}'
      );
    });

    // The review parks in WAITING_FOR_CHILD while the gate holds the decision for up to
    // 168h; the engine's default 6h timeout would cancel it.
    it('outlives the proposal gate it waits on', () => {
      expect(String(reviewDefinition.settings?.timeout)).toMatch(/^\d+h$/);
      expect(hours(reviewDefinition.settings?.timeout)).toBeGreaterThan(
        hours(gateDefinition.settings?.timeout)
      );
    });
  });

  describe('failure containment', () => {
    // The check runs only when the read found the indicator. A missing indicator must
    // not cost a model call, and it must not open an investigation.
    it('runs the coverage check only when the indicator was found', () => {
      expect(stepByName('coverage_check')?.if).toContain(
        'steps.read_ki.output.hits.total.value > 0'
      );
    });

    // A step that dies takes the run with it, so the human never learns what happened.
    // Every step that calls out must let the run reach `emit_result` and report the truth.
    it.each([
      'coverage_check',
      'resolve_rule',
      'attach_rule',
      'run_rule_creation',
      'refetch_rule',
      'refresh_rule_attachment',
      'attach_installed_rule',
      'close_investigation_resolved',
      'close_investigation_dismissed',
      'mark_processed',
    ])('%s continues on failure so the run still reports', (name) => {
      expect(stepByName(name)?.['on-failure']?.continue).toBe(true);
    });

    // The indicator leaves the queue only after an applied decision. No verdict means no
    // proposal was made. An expired proposal decided nothing. A failed rule-creation run
    // decided nothing, and one that asked nobody also decided nothing. An approved enable
    // or install that changed nothing did not apply the decision.
    it('marks the indicator processed only after an applied decision', () => {
      const condition = stepByName('mark_processed')?.if ?? '';
      expect(condition).toContain('structured_output.verdict != null');
      expect(condition).toContain("structured_output.verdict != ''");
      expect(condition).toContain('steps.run_rule_creation.error == null');
      // Step `if` cannot group with parentheses, so the compound tests live in
      // `resolve_outcome` and are read here as flags.
      expect(condition).toContain('steps.resolve_outcome.output.decided == true');
      expect(condition).toContain('steps.resolve_outcome.output.creation_unreviewed == false');
      for (const flag of APPLIED_FLAGS) {
        expect(condition).toContain(`steps.resolve_outcome.output.${flag} == false`);
      }
    });

    // The gate settles an unanswered proposal as `expired` and completes, so the run
    // reaches this step with neither an approval nor a dismissal.
    it.each([
      ['expires', { approved: false, dismissed: false }, false],
      ['is approved', { approved: true, dismissed: false }, true],
      ['is dismissed', { approved: false, dismissed: true }, true],
    ])('on covered_disabled, mark_processed after the proposal %s', (_scenario, gate, expected) => {
      expect(evaluateMarkProcessed({ verdict: 'covered_disabled', ...gate })).toBe(expected);
    });

    // The child can complete with `created: false` without asking anyone when the draft
    // is incomplete or could not be attached. That must not drop the indicator.
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

    // `error` is null for a step its own `if` skipped and for a gate that expired, so it
    // is not evidence of a decision or an applied action.
    it.each(PROPOSAL_STEPS.concat('refetch_rule'))(
      'does not treat a missing %s error as evidence',
      (step) => {
        expect(stepByName('mark_processed')?.if ?? '').not.toContain(`steps.${step}.error`);
      }
    );
  });

  describe('outcome flags', () => {
    const emit = withOf('emit_result');
    const decision = withOf('record_decision');
    const outcome = withOf('resolve_outcome');

    // The gate reports `succeeded` only after the action workflow completed, and a
    // `decision` for every answered proposal. A run that never proposed, or whose
    // proposal expired, matches none of them.
    it('derives every decision flag from the gate status and decision', () => {
      expect(String(decision?.applied)).toContain(
        "steps.propose_enable.output.status == 'succeeded'"
      );
      expect(String(decision?.applied)).toContain(
        "steps.propose_install.output.status == 'succeeded'"
      );
      // One axis per question: what the analyst concluded is read off `decision`,
      // whether the change landed is read off `status`. Enable and install used
      // to read `approved` from `status`, which cannot tell a dismissal from an
      // approved action-less proposal.
      for (const name of PROPOSAL_STEPS) {
        expect(String(decision?.approved)).toContain(`steps.${name}.output.decision == 'approved'`);
        expect(String(decision?.dismissed)).toContain(
          `steps.${name}.output.decision == 'dismissed'`
        );
      }
      // The creation child reports its own gate's decision, so the investigation
      // closes on that path too.
      expect(String(decision?.approved)).toContain(
        "steps.run_rule_creation.output.decision == 'approved'"
      );
      expect(String(decision?.dismissed)).toContain(
        "steps.run_rule_creation.output.decision == 'dismissed'"
      );
      expect(String(outcome?.decided)).toContain('steps.record_decision.output.approved == true');
      expect(String(outcome?.decided)).toContain('steps.record_decision.output.dismissed == true');
      expect(String(outcome?.decided)).toContain("verdict == 'no_coverage'");
    });

    // The action ran inside the gate, and `succeeded` only says the action workflow
    // completed: an install whose package had nothing to install still completes. Every
    // flag must assert evidence from the re-read rule, never the gate status alone.
    it.each([
      ['rule_enabled', 'steps.refetch_rule.output.enabled == true'],
      ['rule_installed', 'steps.refetch_rule.output.id != null'],
    ])('%s asserts mutation evidence, not the gate status alone', (flag, expression) => {
      expect(emit?.[flag]).toContain(expression);
      expect(emit?.[flag]).not.toContain('error == null }}');
    });

    // One field per action tells the caller exactly which approved operation left no trace.
    it.each([
      [
        'enable_approved_not_applied',
        'propose_enable',
        'steps.refetch_rule.output.enabled == true',
      ],
      ['install_approved_not_applied', 'propose_install', 'steps.refetch_rule.output.id != null'],
    ])('%s flags an approval that left no evidence', (flag, gate, evidence) => {
      expect(outcome?.[flag]).toContain(`steps.${gate}.output.decision == 'approved'`);
      expect(outcome?.[flag]).toContain(`not (`);
      expect(outcome?.[flag]).toContain(evidence);
    });

    // One source for the queue write and the report. If they were computed separately, a
    // run could report "approved but not applied" and still drop the indicator.
    it.each(APPLIED_FLAGS)('%s is computed once and forwarded to the output', (flag) => {
      expect(outcome?.[flag]).toBeDefined();
      expect(emit?.[flag]).toBe(`\${{ steps.resolve_outcome.output.${flag} }}`);
    });

    it('computes creation_unreviewed from the child reviewed output', () => {
      expect(outcome?.creation_unreviewed).toContain("verdict == 'no_coverage'");
      expect(outcome?.creation_unreviewed).toContain(
        'steps.run_rule_creation.output.reviewed != true'
      );
    });

    it('reports whether the analyst confirmed an enabled rule covers the gap', () => {
      expect(emit?.coverage_confirmed).toContain(
        "steps.propose_confirm.output.decision == 'approved'"
      );
    });

    // Two different failures need two different messages. "Not found" means the producer
    // or the index is wrong. "No verdict" means the check itself failed.
    it('tells a missing indicator apart from a check that returned no verdict', () => {
      expect(emit?.check_error).toContain('steps.read_ki.output.hits.total.value == 0');
      expect(emit?.check_error).toContain('knowledge indicator not found in this space');
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
      expect(emit?.creation_skip_reason).toBe('{{ steps.run_rule_creation.output.skip_reason }}');
      expect(creationDefinition.outputs?.map(({ name }) => name)).toContain('skip_reason');
    });

    it('hands the investigation back to the caller', () => {
      expect(emit?.investigation_id).toBe(
        '{{ steps.create_investigation.output.conversation_id }}'
      );
    });

    it('reads reviewed from the creation worker, not created, so a dismissal still processes', () => {
      expect(creationDefinition.outputs?.map((output) => output.name)).toEqual(
        expect.arrayContaining(['created', 'reviewed', 'decision', 'rule_name'])
      );
      expect(creationEmit?.reviewed).toContain(
        "steps.propose_creation.output.decision == 'approved'"
      );
      expect(creationEmit?.reviewed).toContain(
        "steps.propose_creation.output.decision == 'dismissed'"
      );
      expect(
        evaluateExpression(creationEmit?.reviewed ?? '', {
          steps: { propose_creation: { output: { decision: 'dismissed' } } },
        })
      ).toBe(true);
      // An expired gate carries no decision and must leave the indicator pending.
      expect(
        evaluateExpression(creationEmit?.reviewed ?? '', {
          steps: { propose_creation: { output: { status: 'expired', decision: '' } } },
        })
      ).toBe(false);
    });
  });

  describe('inputs', () => {
    it('limits the length of every string input', () => {
      const props = reviewDefinition.triggers?.[0]?.inputs?.properties;
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
        'investigation_id',
        'coverage_confirmed',
        'rule_enabled',
        'rule_installed',
        'ki_id',
        'ki_processed',
      ])
    );
  });
});
