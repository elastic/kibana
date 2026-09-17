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
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from '.';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  if?: string;
}

const definition = parse(ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW.yaml) as {
  name?: string;
  tags?: string[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
  triggers?: Array<{ type: string; inputs?: { required?: string[] } }>;
  consts?: Record<string, unknown>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

const allSteps = flatten(definition.steps);
const stepByName = (name: string) => allSteps.find((step) => step.name === name);

describe('Endpoint analysis run', () => {
  it('is the untagged global forensic pass, dispatched rather than scheduled', () => {
    expect(ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW.id).toBe(
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID
    );
    expect(definition.name).toBe('Endpoint analysis run');
    expect(definition.tags).toEqual(['security', 'endpoint-analysis']);
    expect(definition.tags).not.toContain('watch');
    expect(definition.triggers?.map(({ type }) => type)).toEqual(['manual']);
  });

  // It is not a Worker, so it carries no settings block for the Watch page to read.
  it('requires ki_id and ai_index_id and owns no worker settings', () => {
    expect(definition.triggers?.[0]?.inputs?.required).toEqual(['ki_id', 'ai_index_id']);
    expect(definition.consts?.worker_settings).toBeUndefined();
  });

  // The dispatching Worker re-sends a pending indicator every tick until this run
  // marks it processed, so the key has to be the indicator.
  it('collapses repeat dispatches of the same indicator', () => {
    expect(definition.settings?.concurrency).toEqual({
      key: 'endpoint-analysis-{{ inputs.ki_id }}',
      strategy: 'drop',
      max: 1,
    });
  });

  it('reads the indicator before any forensic step', () => {
    expect(definition.steps[0]?.name).toBe('read_ki');
    expect(stepByName('forensic_analysis')?.type).toBe('ai.agent');
    expect(definition.steps.findIndex(({ name }) => name === 'read_ki')).toBeLessThan(
      definition.steps.findIndex(({ name }) => name === 'when_ki_valid')
    );
  });

  // A child execution inherits its parent's space, so the alert lookups stay scoped
  // to the space of the Worker that dispatched the run.
  it('scopes alert lookups to the dispatching space', () => {
    expect(String(stepByName('fetch_attack_discovery_alert')?.with?.index)).toContain(
      '{{ workflow.spaceId }}'
    );
  });

  it('marks the indicator processed only after a valid request', () => {
    const mark = stepByName('mark_processed');
    expect(mark?.type).toBe('context-engine.updateKi');
    expect(mark?.if).toContain('attack_discovery_alert_id');
    expect(mark?.if).toContain('investigation_id');
    expect(mark?.with).toEqual(
      expect.objectContaining({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
      })
    );
  });

  // A malformed indicator stays `pending` unless something retires it, and the sweep
  // selects on exactly that, so leaving it would re-dispatch it every minute for the
  // whole lookback window. These three tests are what keep that loop closed.
  describe('an indicator that names no alert or investigation', () => {
    const whenKiValid = definition.steps.find(({ name }) => name === 'when_ki_valid');

    it('is retired to a status the sweep does not select', () => {
      const markInvalid = stepByName('mark_invalid');
      expect(whenKiValid?.else?.map(({ name }) => name)).toContain('mark_invalid');
      expect(markInvalid?.type).toBe('context-engine.updateKi');
      expect(markInvalid?.with).toEqual({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
        ki: {
          attributes: {
            status: 'invalid',
            invalid_reason: 'Missing attack_discovery_alert_id or investigation_id',
          },
        },
      });
    });

    // Zero hits needs no write: there is no document to retire, and the sweep cannot
    // re-select one that does not exist, so that case settles itself.
    it('writes only when the document exists', () => {
      expect(stepByName('mark_invalid')?.if).toContain('steps.read_ki.output.hits.hits[0]._id');
    });

    // When the investigation id is the missing field there is nowhere to attach.
    it('explains itself on the investigation when there is one', () => {
      const attach = stepByName('attach_invalid_request');
      expect(whenKiValid?.else?.map(({ name }) => name)).toContain('attach_invalid_request');
      expect(attach?.type).toBe('ai.attachment.add');
      expect(attach?.if).toContain('investigation_id');
      expect(attach?.with?.conversation_id).toBe(
        '{{ steps.resolve_request.output.investigation_id }}'
      );
    });
  });
});
