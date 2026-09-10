/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RE2JS } from 're2js';
import { parse } from 'yaml';
import { INFERENCE_PII_ANONYMIZATION_DEFAULTS, INFERENCE_PII_ANONYMIZATION_WORKFLOW } from '.';

describe('INFERENCE_PII_ANONYMIZATION_WORKFLOW', () => {
  // Render with defaults so assertions remain independent of what values the installer passes.
  const workflow = parse(
    INFERENCE_PII_ANONYMIZATION_WORKFLOW.yamlTemplate(INFERENCE_PII_ANONYMIZATION_DEFAULTS)
  ) as Record<string, unknown>;

  it('ships disabled with its output contract', () => {
    expect(workflow.enabled).toBe(false);
    expect(workflow.outputs).toEqual([{ name: 'content', type: 'string', required: true }]);
  });

  it('contains the default regex protection rules', () => {
    const steps = workflow.steps as Array<Record<string, unknown>>;
    const anonymizeStep = steps.find(({ type }) => type === 'ai.pii') as {
      with: { rules: Array<{ entityClass: string; enabled: boolean }> };
    };

    expect(anonymizeStep.with.rules).toEqual(
      expect.arrayContaining(
        ['EMAIL', 'IP', 'HOST_NAME', 'USER_NAME'].map((entityClass) =>
          expect.objectContaining({ entityClass, enabled: true })
        )
      )
    );
  });

  it('all regex patterns compile under RE2', () => {
    const steps = workflow.steps as Array<Record<string, unknown>>;
    const anonymizeStep = steps.find(({ type }) => type === 'ai.pii') as {
      with: { rules: Array<{ type: string; pattern?: string }> };
    };
    const regexRules = anonymizeStep.with.rules.filter(({ type }) => type === 'RegExp');
    for (const rule of regexRules) {
      if (rule.pattern) {
        expect(() => RE2JS.compile(rule.pattern!)).not.toThrow();
      }
    }
  });

  it('wraps exactly one inference call and restores its output', () => {
    const steps = workflow.steps as Array<Record<string, unknown>>;

    expect(steps.filter(({ type }) => type === 'call_site.proceed')).toHaveLength(1);
    expect(steps.map(({ type }) => type)).toEqual([
      'ai.pii',
      'call_site.proceed',
      'transform.pii_restore',
      'workflow.output',
    ]);
    expect(workflow.triggers).toEqual([{ type: 'inference.aroundCompletion' }]);
  });

  it('respects disabled built-in rules in the rendered YAML', () => {
    const renderedWithDisabledIp = parse(
      INFERENCE_PII_ANONYMIZATION_WORKFLOW.yamlTemplate({
        ...INFERENCE_PII_ANONYMIZATION_DEFAULTS,
        builtInRules: INFERENCE_PII_ANONYMIZATION_DEFAULTS.builtInRules.map((r) =>
          r.entityClass === 'IP' ? { ...r, enabled: false } : r
        ),
      })
    ) as Record<string, unknown>;
    const steps = renderedWithDisabledIp.steps as Array<Record<string, unknown>>;
    const anonymizeStep = steps.find(({ type }) => type === 'ai.pii') as {
      with: { rules: Array<{ entityClass: string; enabled: boolean }> };
    };
    const ipRule = anonymizeStep.with.rules.find(({ entityClass }) => entityClass === 'IP');
    expect(ipRule?.enabled).toBe(false);
  });

  it('includes custom rules in the rendered YAML', () => {
    const renderedWithCustomRule = parse(
      INFERENCE_PII_ANONYMIZATION_WORKFLOW.yamlTemplate({
        ...INFERENCE_PII_ANONYMIZATION_DEFAULTS,
        customRules: [
          {
            id: 'rule-1',
            name: 'Project codes',
            entityClass: 'RESOURCE_NAME',
            pattern: String.raw`\bPROJ-[0-9]{4}\b`,
            enabled: true,
          },
        ],
      })
    ) as Record<string, unknown>;
    const steps = renderedWithCustomRule.steps as Array<Record<string, unknown>>;
    const anonymizeStep = steps.find(({ type }) => type === 'ai.pii') as {
      with: { rules: Array<{ entityClass: string }> };
    };
    expect(
      anonymizeStep.with.rules.some(({ entityClass }) => entityClass === 'RESOURCE_NAME')
    ).toBe(true);
  });

  it('renders failureMode to the consts block when provided', () => {
    const renderedWithFailureMode = parse(
      INFERENCE_PII_ANONYMIZATION_WORKFLOW.yamlTemplate({
        ...INFERENCE_PII_ANONYMIZATION_DEFAULTS,
        failureMode: 'allow_unsafe',
      })
    ) as Record<string, unknown>;
    expect((renderedWithFailureMode.consts as Record<string, unknown>)?.failureMode).toBe(
      'allow_unsafe'
    );
  });
});
