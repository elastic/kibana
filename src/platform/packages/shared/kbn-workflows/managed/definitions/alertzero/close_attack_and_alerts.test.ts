/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS } from '.';
import { ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW } from './actions/action_close_attack_discovery_investigation';
import {
  ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW,
  ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID,
} from './close_attack_and_alerts';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean; retry?: { 'max-attempts'?: number; delay?: string } };
}

interface YamlWorkflow {
  tags?: string[];
  consts?: Record<string, unknown>;
  triggers?: Array<{
    type: string;
    inputs?: {
      required?: string[];
      properties?: Record<string, { type?: string; enum?: string[] }>;
      additionalProperties?: boolean;
    };
  }>;
  steps: YamlStep[];
}

const child = parse(ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW.yaml) as YamlWorkflow;
const action = parse(ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW.yaml) as {
  triggers?: Array<{
    inputs?: {
      properties?: { actionInput?: { properties?: Record<string, { enum?: string[] }> } };
    };
  }>;
  steps: YamlStep[];
};
const stepIn = (name: string) => child.steps.find((step) => step.name === name);
const names = child.steps.map(({ name }) => name);

const liquid = createWorkflowLiquidEngine();
const evaluate = (expression: string, context: Record<string, unknown>): unknown =>
  liquid.evalValueSync(
    expression
      .trim()
      .replace(/^\$?\{\{/, '')
      .replace(/\}\}$/, '')
      .trim(),
    context
  );

const attackHit = (alertIds?: string[]) => ({
  _id: 'ad-1',
  _source: {
    'kibana.alert.workflow_status': 'acknowledged',
    ...(alertIds === undefined ? {} : { 'kibana.alert.attack_discovery.alert_ids': alertIds }),
  },
});

describe('Close attack and alerts', () => {
  it('is the untagged child the Close Investigation action executes, installed with the Attack Discovery set', () => {
    expect(ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW.id).toBe(
      ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID
    );
    expect(ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID).toBe(
      'system-alertzero-close-attack-and-alerts'
    );
    expect(ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW.management.enablement).toBe('enforced');
    expect(child.tags).toBeUndefined();
    expect(ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS).toContain(
      ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID
    );

    const execute = action.steps.find(({ name }) => name === 'close_attack_and_alerts');
    expect(execute?.type).toBe('workflow.execute');
    expect(execute?.with?.['workflow-id']).toBe(ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID);
    // The action runs as the approver, so the child keeps that identity by default.
    expect(execute?.with?.['run-as-mode']).toBeUndefined();
  });

  describe('trigger schema', () => {
    const inputs = child.triggers?.[0]?.inputs;

    it('requires the attack and the reason, and nothing else', () => {
      expect(child.triggers?.[0]?.type).toBe('manual');
      expect(inputs?.required).toEqual(['attack_discovery_id', 'reason']);
      expect(inputs?.additionalProperties).toBe(false);
    });

    // The action forwards `attack_reason` as `reason`, so both must take the same values.
    it('takes the reasons the Close Investigation action takes', () => {
      expect(inputs?.properties?.reason?.enum).toEqual(
        action.triggers?.[0]?.inputs?.properties?.actionInput?.properties?.attack_reason?.enum
      );
      const execute = action.steps.find(({ name }) => name === 'close_attack_and_alerts');
      expect(execute?.with?.inputs).toEqual({
        attack_discovery_id: '{{ inputs.actionInput.attack_discovery_id }}',
        reason: '{{ inputs.actionInput.attack_reason }}',
      });
    });
  });

  // The caller may be an action running as the approving analyst or a Worker chain
  // running as a service account. A child call with a literal `run-as-mode` fits
  // only one of them (`inherit` fails under an analyst), so this workflow starts no
  // child and leaves the journal to whoever called it.
  it('starts no child of its own and never picks an identity', () => {
    const childCalls = child.steps.filter(
      ({ type }) => type === 'workflow.execute' || type === 'workflow.executeAsync'
    );
    expect(childCalls).toEqual([]);
    expect(JSON.stringify(child.steps)).not.toContain('run-as-mode');
    expect(JSON.stringify(child.steps)).not.toContain('system-alertzero-journal-note');
  });

  describe('loading the attack', () => {
    const load = stepIn('load_attack');
    const resolve = stepIn('resolve_attack')?.with as Record<string, string>;

    it('reads the persisted and ad-hoc attack by _id or uuid, and fails the run on a read error', () => {
      expect(load?.type).toBe('elasticsearch.search');
      expect(load?.with?.index).toBe(
        '.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }},.adhoc.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }}'
      );
      expect(load?.with?._source).toEqual([
        'kibana.alert.attack_discovery.alert_ids',
        'kibana.alert.workflow_status',
      ]);
      expect(load?.['on-failure']).toEqual({ retry: { 'max-attempts': 3, delay: '5s' } });
    });

    it('tells a missing attack and an attack with no alerts apart', () => {
      const when = (hits: unknown[]) => ({
        steps: { load_attack: { output: { hits: { hits } } } },
      });
      expect(evaluate(resolve.found, when([attackHit(['a-1'])]))).toBe(true);
      expect(evaluate(resolve.found, when([]))).toBe(false);
      expect(evaluate(resolve.has_alerts, when([attackHit(['a-1'])]))).toBe(true);
      expect(evaluate(resolve.has_alerts, when([attackHit([])]))).toBe(false);
      expect(evaluate(resolve.has_alerts, when([attackHit()]))).toBe(false);
      expect(evaluate(resolve.has_alerts, when([]))).toBe(false);
    });
  });

  // Closing an alert another open attack also lists would decide that attack too. The
  // shared ones are found before anything is written, and the run fails if that
  // cannot be told, so nothing is closed on a guess.
  describe('the guardrail', () => {
    const find = stepIn('find_shared_alerts');
    const shared = stepIn('resolve_shared_alerts')?.with as Record<string, string>;

    it('asks which of this attack`s alerts another open or acknowledged attack also lists', () => {
      expect(find?.type).toBe('elasticsearch.search');
      expect(find?.if).toBe('${{ steps.resolve_attack.output.has_alerts == true }}');
      expect(find?.with?.size).toBe(0);
      expect(find?.with?.query).toEqual({
        bool: {
          filter: [
            {
              terms: {
                'kibana.alert.attack_discovery.alert_ids':
                  '${{ steps.resolve_attack.output.alert_ids }}',
              },
            },
            { terms: { 'kibana.alert.workflow_status': '${{ consts.closable_statuses }}' } },
          ],
          must_not: [{ ids: { values: ['{{ steps.resolve_attack.output.attack_id }}'] } }],
        },
      });
      expect(find?.with?.aggregations).toEqual({
        shared: {
          terms: {
            field: 'kibana.alert.attack_discovery.alert_ids',
            include: '${{ steps.resolve_attack.output.alert_ids }}',
            size: 1000,
          },
        },
      });
      expect(child.consts?.closable_statuses).toEqual(['open', 'acknowledged']);
    });

    it('does not continue past a failed read', () => {
      expect(find?.['on-failure']).toEqual({ retry: { 'max-attempts': 3, delay: '5s' } });
      expect(names.indexOf('find_shared_alerts')).toBeLessThan(names.indexOf('close_attack'));
    });

    it('resolves the shared ids from the aggregation, empty when nothing is shared', () => {
      const when = (buckets: Array<{ key: string }>) => ({
        steps: { find_shared_alerts: { output: { aggregations: { shared: { buckets } } } } },
      });
      expect(evaluate(shared.ids, when([{ key: 'a-1' }, { key: 'a-3' }]))).toEqual(['a-1', 'a-3']);
      expect(evaluate(shared.count, when([{ key: 'a-1' }, { key: 'a-3' }]))).toBe(2);
      expect(evaluate(shared.ids, when([]))).toEqual([]);
      expect(evaluate(shared.count, when([]))).toBe(0);
    });
  });

  describe('the close', () => {
    const closeAttack = stepIn('close_attack');
    const closeAlerts = stepIn('close_alerts');

    // `update_related_alerts` would close every related alert with no exceptions.
    it('closes the attack with the reason and without cascading to its alerts', () => {
      expect(closeAttack?.type).toBe('security.setAttackStatus');
      expect(closeAttack?.if).toBe('${{ steps.resolve_attack.output.found == true }}');
      expect(closeAttack?.with).toEqual({
        ids: ['{{ steps.resolve_attack.output.attack_id }}'],
        status: 'closed',
        reason: '{{ inputs.reason }}',
        update_related_alerts: false,
      });
      expect(closeAttack?.['on-failure']).toEqual({ retry: { 'max-attempts': 3, delay: '5s' } });
    });

    it('closes the alerts by query, leaving out the shared ones and anything already closed', () => {
      expect(closeAlerts?.type).toBe('kibana.SetAlertsStatus');
      expect(closeAlerts?.if).toBe('${{ steps.resolve_attack.output.has_alerts == true }}');
      expect(closeAlerts?.with).toEqual({
        status: 'closed',
        reason: '{{ inputs.reason }}',
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [
              { ids: { values: '${{ steps.resolve_attack.output.alert_ids }}' } },
              { terms: { 'kibana.alert.workflow_status': '${{ consts.closable_statuses }}' } },
            ],
            must_not: [{ ids: { values: '${{ steps.resolve_shared_alerts.output.ids }}' } }],
          },
        },
      });
      expect(closeAlerts?.['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '5s' },
        continue: true,
      });
    });

    it('closes the attack before its alerts, then reads them back', () => {
      expect(names.indexOf('close_attack')).toBeLessThan(names.indexOf('close_alerts'));
      expect(names.indexOf('close_alerts')).toBeLessThan(names.indexOf('verify_alerts'));
      expect(names.indexOf('verify_alerts')).toBeLessThan(names.indexOf('emit_result'));
      expect(child.steps[child.steps.length - 1].type).toBe('workflow.output');
    });
  });

  // Everything the caller's journal needs, as read back, never a write's error.
  it('reports what it read back to the caller', () => {
    const emit = stepIn('emit_result');
    expect(emit?.with).toEqual({
      attack_found: '${{ steps.resolve_attack.output.found == true }}',
      attack_closed: '${{ steps.resolve_alerts_closed.output.attack_closed == true }}',
      alerts_requested: '${{ steps.resolve_alerts_closed.output.requested }}',
      alerts_read: '${{ steps.resolve_alerts_closed.output.read == true }}',
      alerts_closed: '${{ steps.resolve_alerts_closed.output.closed }}',
      alerts_open: '${{ steps.resolve_alerts_closed.output.open }}',
      alerts_kept: '${{ steps.resolve_alerts_closed.output.shared }}',
    });
    const declared = (child as { outputs?: Array<{ name: string }> }).outputs?.map(
      ({ name }) => name
    );
    expect(Object.keys(emit?.with ?? {}).sort()).toEqual([...(declared ?? [])].sort());
    expect(JSON.stringify(emit?.with)).not.toContain('error');
  });
});
