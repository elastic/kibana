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

      it('ends in an explicit workflow.output', () => {
        expect(yaml.steps[yaml.steps.length - 1].type).toBe('workflow.output');
      });
    }
  );

  describe('enable rule', () => {
    const yaml = parsed(ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW.yaml);

    it('addresses the rule by saved-object id, never by query', () => {
      const [trigger] = yaml.triggers ?? [];
      expect(trigger?.inputs?.properties?.actionInput?.required).toEqual(['id']);

      const enable = stepByName(yaml, 'enable_rule');
      expect(enable?.type).toBe('security.enableRule');
      expect(enable?.with?.ids).toEqual(['{{ inputs.actionInput.id }}']);
      expect(enable?.with).not.toHaveProperty('query');
    });

    it('reports enabled for a rule that was already on', () => {
      const emit = stepByName(yaml, 'emit_result')?.with as Record<string, string>;
      expect(emit.enabled).toContain('steps.enable_rule.output.succeeded > 0');
      expect(emit.enabled).toContain('steps.enable_rule.output.skipped > 0');
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

    // The install response carries the new saved object, so the fresh path enables by
    // uuid; a rule installed in the meantime is reported as skipped with no saved
    // object, and only then does the signature query stand in.
    it('enables the installed rule by its returned saved-object id', () => {
      const fresh = stepByName(yaml, 'enable_installed_rule');
      const existing = stepByName(yaml, 'enable_existing_rule');

      expect(fresh?.type).toBe('security.enableRule');
      expect(fresh?.if).toContain('steps.install_rule.output.summary.succeeded > 0');
      expect(fresh?.with?.ids).toEqual(['{{ steps.install_rule.output.results.created[0].id }}']);

      expect(existing?.type).toBe('security.enableRule');
      expect(existing?.if).toContain('steps.install_rule.output.summary.skipped > 0');
      expect(String(existing?.with?.query)).toContain('{{ inputs.actionInput.rule_id }}');
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
      ['a fresh install that was enabled', { succeeded: 1 }, { succeeded: 1 }, {}, true, true],
      [
        'a rule installed in the meantime and enabled',
        { skipped: 1 },
        {},
        { skipped: 1 },
        true,
        true,
      ],
      ['an install the API reports as failed', { failed: 1 }, {}, {}, false, false],
      [
        'an install whose enable changed nothing',
        { succeeded: 1 },
        { succeeded: 0 },
        {},
        true,
        false,
      ],
    ])(
      'computes the outcome of %s',
      (_scenario, summary, installedEnable, existingEnable, installed, enabled) => {
        const outcome = stepByName(yaml, 'outcome')?.with as Record<string, string>;
        const context = {
          steps: {
            install_rule: { output: { summary } },
            enable_installed_rule: { output: installedEnable },
            enable_existing_rule: { output: existingEnable },
          },
        };
        expect(evaluateExpression(outcome.installed, context)).toBe(installed);
        expect(evaluateExpression(outcome.enabled, context)).toBe(enabled);
      }
    );

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
