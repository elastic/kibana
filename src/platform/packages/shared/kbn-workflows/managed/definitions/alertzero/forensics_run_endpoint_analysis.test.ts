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
  triggers?: Array<{
    type: string;
    inputs?: {
      required?: string[];
      properties?: Record<string, { pattern?: string; maxLength?: number }>;
    };
  }>;
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

  // `ai_index_id` reaches both the `read_ki` target and `updateKi`. A comma or `*`
  // is valid multi-target syntax, so without a charset bound a manual run could
  // read a document from outside the AI index and feed it to the forensic agent.
  it('rejects an ai_index_id that could widen the read target', () => {
    const { pattern } = definition.triggers?.[0]?.inputs?.properties?.ai_index_id ?? {};
    expect(pattern).toBeDefined();

    const accepts = (value: string) => new RegExp(pattern as string).test(value);
    expect(accepts('security-investigations')).toBe(true);
    expect(accepts('security-investigations,.alerts-security.alerts-default')).toBe(false);
    expect(accepts('*')).toBe(false);
  });

  // The dispatching Worker re-sends a pending indicator every tick until this run
  // retires it, so the key has to be the indicator.
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

  it('marks the indicator processed only after a valid request that wrote something', () => {
    const mark = stepByName('mark_processed');
    expect(mark?.type).toBe('context-engine.updateKi');
    expect(mark?.if).toContain('attack_discovery_alert_id');
    expect(mark?.if).toContain('investigation_id');
    expect(mark?.if).toContain('steps.resolve_run_outcome.output.attached == true');
    expect(mark?.with).toEqual(
      expect.objectContaining({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
      })
    );
  });

  // Every attach step continues on failure, so a run can resolve a host, analyze it,
  // and still land nothing on the investigation — a rejected payload, or a principal
  // without OWNER access on the conversation. `processed` would then retire the
  // indicator for work that never arrived, and nothing would ever say so.
  describe('a run that writes nothing to the investigation', () => {
    it('is retired as failed rather than processed', () => {
      const markFailed = stepByName('mark_failed');
      expect(markFailed?.type).toBe('context-engine.updateKi');
      expect(markFailed?.if).toContain('steps.resolve_run_outcome.output.attached != true');
      expect(markFailed?.with).toEqual({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
        ki: {
          attributes: {
            status: 'failed',
            failure_reason:
              'Nothing could be attached to investigation {{ steps.resolve_request.output.investigation_id }}',
          },
        },
      });
    });

    // Both outcomes write a terminal status. Leaving either path without one would put
    // the indicator back in the sweep's selector and start a 15m agent run per minute.
    it('leaves no valid request on a status the sweep still selects', () => {
      const statuses = ['mark_processed', 'mark_failed', 'mark_invalid'].map(
        (name) => (stepByName(name)?.with?.ki as { attributes?: { status?: string } })?.attributes
      );
      expect(statuses.map((attributes) => attributes?.status)).toEqual([
        'processed',
        'failed',
        'invalid',
      ]);
      expect(stepByName('mark_processed')?.if).toContain('attached == true');
      expect(stepByName('mark_failed')?.if).toContain('attached != true');
    });

    // The guard is only as good as the list it checks, so a new attachment that is not
    // in it would reopen exactly the hole this closes.
    it('accounts for every attachment the valid path can write', () => {
      const attached = String(stepByName('resolve_run_outcome')?.with?.attached);
      const validPathAttachments = allSteps
        .filter(({ type }) => type === 'ai.attachment.add')
        .map(({ name }) => name)
        // The malformed-indicator note belongs to the `mark_invalid` path, which is
        // terminal on its own and never reaches this decision.
        .filter((name) => name !== 'attach_invalid_request');

      expect(validPathAttachments).not.toHaveLength(0);
      for (const name of validPathAttachments) {
        expect(attached).toContain(`steps.${name}.output.attachment_id`);
      }
    });

    it('reports whether anything was attached so a handoff can be desk-tested', () => {
      expect(stepByName('emit_result')?.with?.attachments_written).toBe(
        '${{ steps.resolve_run_outcome.output.attached == true }}'
      );
    });
  });

  // Each action publishes its own input contract as `inputSchema` on its catalog
  // entry, which the model only sees once it has called the catalog — after this
  // schema is fixed. So the contract cannot live here, and a copy of it would pin
  // today's Defend actions onto every future one while drifting from bounds this
  // cannot express. `assertActionInputValid` rejects a bad input at proposal time.
  describe('containment proposals', () => {
    const schema = stepByName('forensic_analysis')?.with?.schema as {
      properties?: {
        recommendedActions?: {
          items?: {
            required?: string[];
            properties?: Record<string, Record<string, unknown>>;
          };
        };
      };
    };
    const recommendation = schema?.properties?.recommendedActions?.items;

    it('leaves the action input shape to the catalog instead of restating it', () => {
      const actionInput = recommendation?.properties?.actionInput;
      expect(actionInput?.type).toBe('object');
      expect(actionInput?.additionalProperties).toBe(true);
      // A restated shape is exactly what must not come back: `required: [endpoint_ids]`
      // would make an action that takes none impossible to propose.
      expect(actionInput?.properties).toBeUndefined();
      expect(actionInput?.required).toBeUndefined();
    });

    // Only `actionId`, `comment` and `actionInput` are read when the proposal is
    // dispatched, so a field the workflow never passes on is one the model spends
    // tokens filling for nothing.
    it('asks only for the fields the proposal dispatch passes on', () => {
      expect(Object.keys(recommendation?.properties ?? {}).sort()).toEqual([
        'actionId',
        'actionInput',
        'comment',
      ]);
      expect(recommendation?.required).toEqual(['actionId', 'actionInput']);
    });

    // Naming a process selector is fine — that is which action to pick, and the
    // provenance of a value. Spelling out the object the action receives is the
    // restatement, and `endpoint_ids` / `agentId` were how it was written.
    it('points the agent at each entry inputSchema rather than a fixed shape', () => {
      const message = stepByName('forensic_analysis')?.with?.message as string;
      expect(message).toContain('inputSchema');
      expect(message).not.toContain('endpoint_ids');
      expect(message).not.toContain('agentId');
    });
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
