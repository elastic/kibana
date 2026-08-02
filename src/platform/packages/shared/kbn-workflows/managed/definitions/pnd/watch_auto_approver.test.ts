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
  PND_WATCH_AUTO_APPROVER_WORKFLOW,
  PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
  PND_WORKFLOW_TEMPLATE_VALUES,
} from '.';

interface ParsedInputProperty {
  type?: string;
  description?: string;
}

interface ParsedTriggerInputs {
  properties?: Record<string, ParsedInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

interface ParsedTrigger {
  type: string;
  inputs?: ParsedTriggerInputs;
}

interface ParsedOnFailure {
  continue?: boolean | string;
  retry?: { 'max-attempts'?: number };
}

interface ParsedStep {
  name: string;
  type: string;
  'on-failure'?: ParsedOnFailure;
  with?: {
    body?: Record<string, unknown>;
    duration?: string;
    headers?: Record<string, string>;
    method?: string;
    path?: string;
  };
}

interface ParsedWorkflow {
  steps?: ParsedStep[];
  triggers?: ParsedTrigger[];
}

const rendered = PND_WATCH_AUTO_APPROVER_WORKFLOW.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES);
const parsed = parse(rendered) as ParsedWorkflow;
const steps = parsed.steps ?? [];

const getStep = (name: string): ParsedStep => {
  const step = steps.find((s) => s.name === name);
  if (!step) {
    throw new Error(`No '${name}' step found in the auto-approver workflow`);
  }
  return step;
};

/**
 * kibana-tjil.6 / A5. The auto-approver is a per-run child the Floor arms via
 * `workflow.executeAsync`. It is installable, catalog-invisible, and never resumable. The ladder is
 * three waits (15s / 60s / 300s) each followed by POST `_auto_respond` with `origin: auto`. Every
 * step continues on failure and none retries — a 403 must stay a 403.
 */
describe('watch_auto_approver.yaml', () => {
  it('is registered at the worker id the Floor arms', () => {
    expect(PND_WATCH_AUTO_APPROVER_WORKFLOW.id).toBe('system-security-watch-auto-approver');
  });

  it('exports the same id as a named constant', () => {
    expect(PND_WATCH_AUTO_APPROVER_WORKFLOW_ID).toBe(PND_WATCH_AUTO_APPROVER_WORKFLOW.id);
  });

  it('uses worker visibility, so it never renders in the Watch catalog', () => {
    expect(PND_WATCH_AUTO_APPROVER_WORKFLOW.visibility).toEqual({ solutions: ['security'] });
  });

  it('is a pnd static definition, so ready() will install rather than orphan-delete it', () => {
    expect(PND_WATCH_AUTO_APPROVER_WORKFLOW.pluginId).toBe('pnd');
    expect(PND_WATCH_AUTO_APPROVER_WORKFLOW.management.lifecycle).toBe('static');
  });

  it('declares only a manual trigger', () => {
    expect((parsed.triggers ?? []).map(({ type }) => type)).toEqual(['manual']);
  });

  it('requires watch_id and space_id, and nothing else', () => {
    const inputs = (parsed.triggers ?? []).find(({ type }) => type === 'manual')?.inputs;

    expect(Object.keys(inputs?.properties ?? {}).sort()).toEqual(['space_id', 'watch_id']);
    expect(inputs?.required?.slice().sort()).toEqual(['space_id', 'watch_id']);
    expect(inputs?.additionalProperties).toBe(false);
  });

  it('is a bounded three-rung ladder, wait then POST at each delay', () => {
    expect(steps.map(({ name, type }) => ({ name, type }))).toEqual([
      { name: 'wait_15s', type: 'wait' },
      { name: 'auto_respond_15s', type: 'kibana.request' },
      { name: 'wait_60s', type: 'wait' },
      { name: 'auto_respond_60s', type: 'kibana.request' },
      { name: 'wait_300s', type: 'wait' },
      { name: 'auto_respond_300s', type: 'kibana.request' },
    ]);
  });

  it.each([
    ['wait_15s', '15s'],
    ['wait_60s', '60s'],
    ['wait_300s', '300s'],
  ])('%s waits %s', (stepName, duration) => {
    expect(getStep(stepName).with?.duration).toBe(duration);
  });

  it.each(steps.map(({ name }) => name))(
    '%s continues on failure, so a 403 cannot abort the remaining rungs',
    (stepName) => {
      expect(getStep(stepName)['on-failure']?.continue).toBe(true);
    }
  );

  it.each(steps.map(({ name }) => name))(
    '%s never retries, so a 403 is not replayed',
    (stepName) => {
      expect(getStep(stepName)['on-failure']?.retry).toBeUndefined();
    }
  );

  describe.each(['auto_respond_15s', 'auto_respond_60s', 'auto_respond_300s'])('%s', (stepName) => {
    const step = getStep(stepName);

    it('POSTs', () => {
      expect(step.with?.method).toBe('POST');
    });

    it('targets _auto_respond in the input space', () => {
      expect(step.with?.path).toBe('/s/{{ inputs.space_id }}/internal/pnd/proposals/_auto_respond');
    });

    it('sends elastic-api-version, because PND internal routes are versioned', () => {
      expect(step.with?.headers?.['elastic-api-version']).toBe('1');
    });

    it('sends origin auto so the route stamps pnd-autonomy-auto', () => {
      expect(step.with?.body?.origin).toBe('auto');
    });

    it('scopes the respond to the parent watch the Floor armed', () => {
      expect(step.with?.body?.watchId).toBe('{{ inputs.watch_id }}');
    });

    it('sends exactly the two-field contract', () => {
      expect(Object.keys(step.with?.body ?? {}).sort()).toEqual(['origin', 'watchId']);
    });
  });

  // managed_workflow_definitions.test.ts forbids the substring anywhere in rendered YAML,
  // comments included. Pin it here so a prose edit fails in this file first.
  it('never writes the substring that the platform smoke test forbids', () => {
    expect(rendered).not.toContain('undefined');
  });
});
