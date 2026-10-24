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
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW,
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW,
  ALERTZERO_ACTION_WORKFLOW_IDS,
} from '..';
import { createWorkflowLiquidEngine } from '../../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
}

interface ActionInputSchema {
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties?: boolean;
}

interface ActionYaml {
  tags?: string[];
  consts?: { actionMetadata?: Record<string, unknown> };
  triggers?: Array<{
    type: string;
    inputs?: {
      properties?: { actionInput?: ActionInputSchema };
      required?: string[];
      additionalProperties?: boolean;
    };
  }>;
  steps: YamlStep[];
}

// The three rule actions this workflow set owns. The universal contract — tag,
// valid actionMetadata, one actionInput object, explicit output — is asserted for
// every registered action by definitions/action_workflows.test.ts, which discovers
// them by tag. What is left here is specific to these three: they always gate, and
// they carry a rule body the detection engine has to accept.
const ACTIONS = [
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW,
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW,
] as const;

const parsed = (yaml: string) => parse(yaml) as ActionYaml;
const stepByName = (yaml: ActionYaml, name: string) =>
  yaml.steps.find((step) => step.name === name);

const evaluateExpression = (expression: string, context: Record<string, unknown>): unknown => {
  const trimmed = expression.trim();
  return createWorkflowLiquidEngine().evalValueSync(trimmed.slice(3, -2).trim(), context);
};

const runsStep = (yaml: ActionYaml, name: string, context: Record<string, unknown>) =>
  evaluateExpression(String(stepByName(yaml, name)?.if), context) === true;

// Gated steps that run, in order, stopping at the first workflow.fail that fires.
const traceSteps = (yaml: ActionYaml, context: Record<string, unknown>) => {
  const ran = yaml.steps.filter((step) => step.if && runsStep(yaml, step.name, context));
  const fail = ran.findIndex(({ type }) => type === 'workflow.fail');
  return (fail === -1 ? ran : ran.slice(0, fail + 1)).map(({ name }) => name);
};

describe('AlertZero action workflows', () => {
  it('is part of the install set', () => {
    expect(ALERTZERO_ACTION_WORKFLOW_IDS).toEqual(
      expect.arrayContaining(ACTIONS.map(({ id }) => id))
    );
  });

  // The contract the proposal gate relies on: discoverable by tag, self-describing
  // metadata under consts, a single actionInput object, an explicit output.
  describe.each(ACTIONS.map((action) => [action.id, parsed(action.yaml)] as const))(
    '%s',
    (_id, yaml) => {
      it('carries the action tag', () => {
        expect(yaml.tags).toContain('action');
      });

      it('declares always-gated catalog metadata', () => {
        const metadata = yaml.consts?.actionMetadata;
        expect(metadata?.name).toEqual(expect.any(String));
        expect(metadata?.category).toEqual(expect.any(String));
        expect(metadata?.approvalPolicy).toBe('always-gate');
      });

      it('takes a single actionInput object with required scope fields', () => {
        const [trigger] = yaml.triggers ?? [];
        expect(trigger?.type).toBe('manual');
        expect(trigger?.inputs?.required).toEqual(['actionInput']);
        expect(trigger?.inputs?.properties?.actionInput?.required?.length).toBeGreaterThan(0);
      });

      // Unknown keys are rejected when the proposal is created, not when it is applied,
      // so a drafted body carrying a field the action cannot honour never reaches an
      // analyst.
      it('rejects unknown fields on actionInput, so they fail at proposal creation', () => {
        const [trigger] = yaml.triggers ?? [];
        expect(trigger?.inputs?.properties?.actionInput?.additionalProperties).toBe(false);
      });

      // elastic/security-team#20135: an auth proxy's sign-in redirect must fail the step.
      it('refuses redirects on every Kibana request', () => {
        for (const step of yaml.steps.filter(({ type }) => type === 'kibana.request')) {
          expect(step.with?.fetcher).toEqual({ follow_redirects: false });
        }
      });

      it('ends in an explicit workflow.output', () => {
        expect(yaml.steps[yaml.steps.length - 1].type).toBe('workflow.output');
      });
    }
  );

  describe('enable rule', () => {
    const yaml = parsed(ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW.yaml);

    it('addresses the rule by saved-object id, never by query', () => {
      const [trigger] = yaml.triggers ?? [];
      expect(trigger?.inputs?.properties?.actionInput?.required).toEqual([
        'id',
        'expected_revision',
        'investigation_id',
      ]);

      const enable = stepByName(yaml, 'enable_rule');
      expect(enable?.type).toBe('security.enableRule');
      expect(enable?.with?.ids).toEqual(['{{ inputs.actionInput.id }}']);
      expect(enable?.with).not.toHaveProperty('query');
    });

    it('reads the rule by its URL-encoded saved-object id before enabling it', () => {
      const fetch = stepByName(yaml, 'fetch_rule');
      expect(fetch?.type).toBe('kibana.request');
      expect(fetch?.with?.method).toBe('GET');

      const path = createWorkflowLiquidEngine().parseAndRenderSync(String(fetch?.with?.path), {
        workflow: { spaceId: 'default' },
        inputs: { actionInput: { id: 'a&b' } },
      });
      expect(path).toBe('/s/default/api/detection_engine/rules?id=a%26b');

      const names = yaml.steps.map(({ name }) => name);
      expect(names.indexOf('fetch_rule')).toBeLessThan(names.indexOf('enable_rule'));
      expect(names.indexOf('fail_rule_changed')).toBeLessThan(names.indexOf('enable_rule'));
    });

    const disabled = { enabled: false, revision: 3, name: 'R', updated_by: 'elastic' };
    const enabled = { ...disabled, enabled: true, revision: 4 };
    const deleted = { error: { message: 'HTTP 404: Not Found' } };

    // Steps that run, in order, for each rule state found at approval time.
    it.each([
      ['an unchanged disabled rule', { output: disabled }, 3, ['enable_rule']],
      [
        'a disabled rule edited since',
        { output: { ...disabled, revision: 5 } },
        3,
        ['fail_rule_changed'],
      ],
      ['a rule enabled by hand', { output: enabled }, 3, ['note_already_enabled']],
      ['a deleted rule', deleted, 3, ['fail_rule_deleted']],
    ])('handles %s', (_scenario, fetch, expected, steps) => {
      const context = {
        steps: { fetch_rule: fetch },
        inputs: { actionInput: { id: 'x', expected_revision: expected, investigation_id: 'c' } },
      };
      expect(traceSteps(yaml, context)).toEqual(steps);
    });

    // The coverage check matched the rule as proposed, so an edit is worth flagging.
    it.each([
      [
        'a rule only enabled by hand',
        3,
        'Rule "R" was already enabled when this proposal was approved. No change was made.',
      ],
      [
        'a rule enabled and edited by hand',
        5,
        'Rule "R" was already enabled when this proposal was approved. No change was made. ' +
          'It was also changed by "elastic" after this proposal was created, so check that it ' +
          'still covers this gap.',
      ],
    ])('posts the chat note for %s', (_scenario, revision, note) => {
      const step = stepByName(yaml, 'note_already_enabled');
      const { message } = (step?.with?.inputs ?? {}) as { message: string };
      const context = {
        steps: { fetch_rule: { output: { ...enabled, revision } } },
        inputs: { actionInput: { id: 'x', expected_revision: 3, investigation_id: 'c' } },
      };
      expect(createWorkflowLiquidEngine().parseAndRenderSync(message, context)).toBe(note);
    });

    it.each([
      ['a rule it enabled', disabled, { succeeded: 1, skipped: 0, failed: 0 }, true, false, 1],
      ['a rule enabled by hand', enabled, undefined, true, true, 0],
    ])('reports %s', (_scenario, rule, enable, isEnabled, alreadyEnabled, succeeded) => {
      const emit = stepByName(yaml, 'emit_result')?.with as Record<string, string>;
      const context = {
        steps: { fetch_rule: { output: rule }, enable_rule: enable && { output: enable } },
      };
      expect(evaluateExpression(emit.enabled, context)).toBe(isEnabled);
      expect(evaluateExpression(emit.already_enabled, context)).toBe(alreadyEnabled);
      expect(evaluateExpression(emit.succeeded, context)).toBe(succeeded);
    });
  });

  describe('install prebuilt rule', () => {
    const yaml = parsed(ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW.yaml);

    it('installs by signature id and package version', () => {
      const [trigger] = yaml.triggers ?? [];
      const actionInput = trigger?.inputs?.properties?.actionInput;
      expect(actionInput?.required).toEqual(['rule_id', 'version']);
      expect(actionInput?.properties?.version).toEqual(
        expect.objectContaining({ type: 'integer', minimum: 1 })
      );

      const install = stepByName(yaml, 'install_rule');
      expect(install?.type).toBe('kibana.request');
      expect(String(install?.with?.path)).toContain('/prebuilt_rules/installation/_perform');
      expect((install?.with?.body as Record<string, unknown>).mode).toBe('SPECIFIC_RULES');
    });

    it('enables the installed rule by its returned saved-object id', () => {
      const fresh = stepByName(yaml, 'enable_installed_rule');
      expect(fresh?.type).toBe('security.enableRule');
      expect(fresh?.if).toContain('steps.install_rule.output.summary.succeeded > 0');
      expect(fresh?.with?.ids).toEqual(['{{ steps.install_rule.output.results.created[0].id }}']);
    });

    // `security.enableRule` enables every rule a query matches, and `rule_id` is only
    // length-checked, so a quote in it must not reach a query.
    it('never enables by a query built from rule_id', () => {
      for (const step of yaml.steps.filter(({ type }) => type === 'security.enableRule')) {
        expect(step.with).not.toHaveProperty('query');
      }
    });

    it('looks the installed rule up by its exact, URL-encoded signature id', () => {
      const find = stepByName(yaml, 'find_installed_rule');
      expect(find?.type).toBe('kibana.request');
      expect(find?.with?.method).toBe('GET');

      const path = createWorkflowLiquidEngine().parseAndRenderSync(String(find?.with?.path), {
        workflow: { spaceId: 'default' },
        inputs: { actionInput: { rule_id: 'x" or alert.attributes.enabled: false or "' } },
      });
      expect(path).toBe(
        '/s/default/api/detection_engine/rules?rule_id=x%22+or+alert.attributes.enabled%3A+false+or+%22'
      );
    });

    it('checks the rule before installing it', () => {
      const names = yaml.steps.map(({ name }) => name);
      const install = names.indexOf('install_rule');
      for (const check of ['fail_already_installed', 'fail_rule_lookup', 'fail_version_changed']) {
        expect(names.indexOf(check)).toBeLessThan(install);
      }
    });

    it('fails with the stale message when the rule is installed during the approval', () => {
      const context = {
        steps: {
          review_rule: { output: { rules: [{ rule_id: 'r', version: 10, name: 'R' }] } },
          install_rule: { output: { summary: { skipped: 1 } } },
        },
        inputs: { actionInput: { rule_id: 'r', version: 10 } },
      };
      const fail = stepByName(yaml, 'fail_install_skipped');
      expect(runsStep(yaml, 'fail_install_skipped', context)).toBe(true);
      expect(
        createWorkflowLiquidEngine().parseAndRenderSync(String(fail?.with?.message), context)
      ).toBe(
        'The rule "R" was installed after this proposal was created. Approving again won\'t work, so decline it.'
      );

      const names = yaml.steps.map(({ name }) => name);
      expect(names.indexOf('fail_install_skipped')).toBeLessThan(
        names.indexOf('enable_installed_rule')
      );
    });

    it('filters the installation review by the exact signature id', () => {
      const review = stepByName(yaml, 'review_rule');
      const body = review?.with?.body as { filter: { term: string } };
      expect(
        createWorkflowLiquidEngine().parseAndRenderSync(body.filter.term, {
          inputs: { actionInput: { rule_id: 'r-1' } },
        })
      ).toBe('security-rule.rule_id: "r-1"');
    });

    const notInstalled = { error: { message: 'HTTP 404: Not Found' } };
    const latest = (version: number, ruleId = 'r') => ({
      output: { rules: [{ rule_id: ruleId, version, name: 'R' }] },
    });
    const landed = {
      install_rule: { output: { summary: { succeeded: 1 } } },
      enable_installed_rule: { output: { succeeded: 1 } },
      outcome: { output: { installed: true, enabled: true } },
    };

    // Steps that run, in order, for each rule state found at approval time.
    it.each([
      ['a rule still at the proposed version', notInstalled, latest(10), ['enable_installed_rule']],
      [
        'a rule installed since',
        { output: { id: 'so', name: 'R' } },
        latest(10),
        ['fail_already_installed'],
      ],
      ['a rule with a newer version', notInstalled, latest(11), ['fail_version_changed']],
      [
        'a review that matched another rule',
        notInstalled,
        latest(11, 'other'),
        ['enable_installed_rule'],
      ],
      [
        'a rule lookup that failed',
        { error: { message: 'HTTP 500: boom' } },
        latest(10),
        ['fail_rule_lookup'],
      ],
    ])('handles %s', (_scenario, find, review, steps) => {
      const context = {
        steps: { find_installed_rule: find, review_rule: review, ...landed },
        inputs: { actionInput: { rule_id: 'r', version: 10 } },
      };
      expect(traceSteps(yaml, context)).toEqual(steps);
    });

    it('reports the installed saved-object id to the caller', () => {
      const emit = stepByName(yaml, 'emit_result')?.with as Record<string, string>;
      expect(emit.id).toBe('{{ steps.install_rule.output.results.created[0].id }}');
      expect(emit.installed).toBe('${{ steps.outcome.output.installed }}');
      expect(emit.enabled).toBe('${{ steps.outcome.output.enabled }}');
    });

    // The install API answers 200 even when it installed nothing, and the gate counts
    // an error-free run as success, so the action has to fail on what did not land.
    it.each([
      ['a fresh install that was enabled', { succeeded: 1 }, { succeeded: 1 }, true, true],
      ['a rule installed between the check and the install', { skipped: 1 }, {}, false, false],
      ['an install the API reports as failed', { failed: 1 }, {}, false, false],
      ['an install whose enable changed nothing', { succeeded: 1 }, { succeeded: 0 }, true, false],
    ])('computes the outcome of %s', (_scenario, summary, enable, installed, enabled) => {
      const outcome = stepByName(yaml, 'outcome')?.with as Record<string, string>;
      const context = {
        steps: {
          install_rule: { output: { summary } },
          enable_installed_rule: { output: enable },
        },
      };
      expect(evaluateExpression(outcome.installed, context)).toBe(installed);
      expect(evaluateExpression(outcome.enabled, context)).toBe(enabled);
    });

    it('fails the action before emitting when the rule is not installed and enabled', () => {
      const fail = stepByName(yaml, 'fail_not_applied');
      expect(fail?.type).toBe('workflow.fail');
      expect(fail?.if).toContain('steps.outcome.output.installed != true');
      expect(fail?.if).toContain('steps.outcome.output.enabled != true');

      const names = yaml.steps.map(({ name }) => name);
      expect(names.indexOf('outcome')).toBeLessThan(names.indexOf('fail_not_applied'));
      expect(names.indexOf('fail_not_applied')).toBeLessThan(names.indexOf('emit_result'));
    });
  });
});
