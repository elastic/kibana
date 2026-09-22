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

const ACTIONS = [
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW,
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW,
] as const;

const parsed = (yaml: string) => parse(yaml) as ActionYaml;
const stepByName = (yaml: ActionYaml, name: string) =>
  yaml.steps.find((step) => step.name === name);

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

      // Unknown keys are rejected when the proposal is created, not when it is applied.
      it('rejects unknown fields on actionInput, so they fail at proposal creation', () => {
        const [trigger] = yaml.triggers ?? [];
        expect(trigger?.inputs?.properties?.actionInput?.additionalProperties).toBe(false);
      });

      it('bounds every actionInput string so an unbounded value fails at proposal creation', () => {
        const props = yaml.triggers?.[0]?.inputs?.properties?.actionInput?.properties ?? {};
        const uncapped = Object.entries(props)
          .filter(
            ([, schema]) =>
              schema.type === 'string' && schema.maxLength == null && schema.enum == null
          )
          .map(([name]) => name);
        expect(uncapped).toEqual([]);
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
        expect.objectContaining({ type: 'number', minimum: 1 })
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
      expect(emit.installed).toContain('steps.install_rule.output.summary.succeeded > 0');
      expect(emit.installed).toContain('steps.install_rule.output.summary.skipped > 0');
    });
  });
});
