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
  ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW,
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
  condition?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  'on-failure'?: { continue?: boolean };
}

interface ActionInputSchema {
  properties?: Record<string, Record<string, unknown> & { enum?: string[] }>;
  required?: string[];
  additionalProperties?: boolean;
}

interface ActionYaml {
  tags?: string[];
  consts?: {
    actionMetadata?: Record<string, unknown>;
    required_index_privileges?: string[];
    required_api_privileges?: string[];
  };
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
    // object, so its uuid is looked up by exact signature id first.
    it('enables the installed rule by its returned saved-object id', () => {
      const fresh = stepByName(yaml, 'enable_installed_rule');
      const existing = stepByName(yaml, 'enable_existing_rule');

      expect(fresh?.type).toBe('security.enableRule');
      expect(fresh?.if).toContain('steps.install_rule.output.summary.succeeded > 0');
      expect(fresh?.with?.ids).toEqual(['{{ steps.install_rule.output.results.created[0].id }}']);

      expect(existing?.type).toBe('security.enableRule');
      expect(existing?.if).toContain('steps.install_rule.output.summary.skipped > 0');
      expect(existing?.with?.ids).toEqual(['{{ steps.find_existing_rule.output.id }}']);
    });

    // `security.enableRule` enables every rule a query matches, and `rule_id` is only
    // length-checked, so a quote in it must not reach a query.
    it('never enables by a query built from rule_id', () => {
      for (const step of yaml.steps.filter(({ type }) => type === 'security.enableRule')) {
        expect(step.with).not.toHaveProperty('query');
      }
    });

    it('looks the already-installed rule up by its exact, URL-encoded signature id', () => {
      const find = stepByName(yaml, 'find_existing_rule');
      expect(find?.type).toBe('kibana.request');
      expect(find?.if).toContain('steps.install_rule.output.summary.skipped > 0');
      expect(find?.with?.method).toBe('GET');

      const names = yaml.steps.map(({ name }) => name);
      expect(names.indexOf('find_existing_rule')).toBeLessThan(
        names.indexOf('enable_existing_rule')
      );

      const path = createWorkflowLiquidEngine().parseAndRenderSync(String(find?.with?.path), {
        workflow: { spaceId: 'default' },
        inputs: { actionInput: { rule_id: 'x" or alert.attributes.enabled: false or "' } },
      });
      expect(path).toBe(
        '/s/default/api/detection_engine/rules?rule_id=x%22+or+alert.attributes.enabled%3A+false+or+%22'
      );
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

  // Closing an Investigation is the analyst's call in every autonomy mode, and the
  // approver is not the account that opened the Investigation, so the close has to
  // go through the status route rather than the owner-only metadata patch.
  describe('close investigation', () => {
    const yaml = parsed(ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW.yaml);
    const metadata = yaml.consts?.actionMetadata;
    const actionInput = yaml.triggers?.[0]?.inputs?.properties?.actionInput;

    it('is part of the install set and always gates', () => {
      expect(ALERTZERO_ACTION_WORKFLOW_IDS).toContain(
        ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW.id
      );
      expect(yaml.tags).toContain('action');
      expect(metadata?.approvalPolicy).toBe('always-gate');
      expect(metadata?.reversible).toBe(true);
    });

    it('is a respond action', () => {
      expect(metadata?.category).toBe('respond');
    });

    // No host, process or identity field: the proposal dedup keys an input without a
    // target to the Investigation and the action, which keeps one Close question open
    // per Investigation at a time.
    it('takes the Investigation, its attack and the reasons, and names no target', () => {
      expect(actionInput?.required).toEqual([
        'investigation_id',
        'attack_discovery_id',
        'close_reason',
        'attack_reason',
      ]);
      expect(actionInput?.additionalProperties).toBe(false);
      const fields = Object.keys(actionInput?.properties ?? {});
      for (const target of ['endpoint_ids', 'parameters', 'id_field', 'id_value', 'alertIds']) {
        expect(fields).not.toContain(target);
      }
      expect(actionInput?.properties?.close_reason?.enum).toEqual([
        'false_positive',
        'benign',
        'resolved',
        'duplicate',
        'other',
      ]);
      expect(actionInput?.properties?.attack_reason?.enum).toEqual([
        'false_positive',
        'true_positive',
        'benign_positive',
        'duplicate',
        'other',
      ]);
    });

    // The action runs as the approver and the status routes write with the approver's
    // privileges, so an account that cannot close alerts is turned away before anything
    // is closed, with what to grant, instead of a 403 after the attack is already closed.
    describe('checks the approving account first', () => {
      const probe = stepByName(yaml, 'probe_privileges');
      const resolve = stepByName(yaml, 'resolve_privileges');
      const gate = stepByName(yaml, 'fail_if_unprivileged');
      const fail = gate?.steps?.[0];
      const spaceId = 'default';

      const render = (template: unknown, context: Record<string, unknown>) =>
        createWorkflowLiquidEngine().parseAndRenderSync(String(template), {
          workflow: { spaceId },
          ...context,
        });

      /** A `_has_privileges` answer, granted everywhere except where `deny` says. */
      const probeOutput = ({
        api = [],
        indices = {},
      }: {
        api?: string[];
        indices?: Record<string, Partial<Record<'index' | 'maintenance', boolean>>>;
      } = {}) => {
        const names = [
          `.alerts-security.attack.discovery.alerts-${spaceId}`,
          `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`,
          `.alerts-security.alerts-${spaceId}`,
        ];
        return {
          application: {
            'kibana-.kibana': {
              [`space:${spaceId}`]: {
                'api:alerts-all': !api.includes('api:alerts-all'),
                'api:alerts-signal-update-deprecated-privilege': !api.includes(
                  'api:alerts-signal-update-deprecated-privilege'
                ),
              },
            },
          },
          index: Object.fromEntries(
            names.map((name) => [
              name,
              { index: true, maintenance: true, ...(indices[name] ?? {}) },
            ])
          ),
        };
      };

      const missingFor = (output: unknown) =>
        render(resolve?.with?.missing, { steps: { probe_privileges: { output } } });

      const fails = (probeStep: Record<string, unknown>, missing: string) =>
        evaluateExpression(String(gate?.condition), {
          steps: { probe_privileges: probeStep, resolve_privileges: { output: { missing } } },
        });

      it('asks Elasticsearch, as the approver, for the exact grants the routes need', () => {
        const names = yaml.steps.map(({ name }) => name);
        expect(names.slice(0, 4)).toEqual([
          'probe_privileges',
          'resolve_privileges',
          'fail_if_unprivileged',
          'close_attack_and_alerts',
        ]);

        expect(probe?.type).toBe('elasticsearch.request');
        expect(probe?.with?.method).toBe('POST');
        expect(probe?.with?.path).toBe('/_security/user/_has_privileges');
        // Fails closed below rather than failing the run on the probe's own error.
        expect(probe?.['on-failure']).toEqual({ continue: true });

        expect(yaml.consts?.required_index_privileges).toEqual(['index', 'maintenance']);
        expect(yaml.consts?.required_api_privileges).toEqual([
          'api:alerts-all',
          'api:alerts-signal-update-deprecated-privilege',
        ]);
        expect(probe?.with?.body).toEqual({
          application: [
            {
              application: 'kibana-.kibana',
              privileges: '${{ consts.required_api_privileges }}',
              resources: ['space:{{ workflow.spaceId }}'],
            },
          ],
          index: [
            {
              names: [
                '.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }}',
                '.adhoc.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }}',
                '.alerts-security.alerts-{{ workflow.spaceId }}',
              ],
              privileges: '${{ consts.required_index_privileges }}',
            },
          ],
        });
      });

      it('finds nothing missing when everything is granted', () => {
        expect(missingFor(probeOutput())).toBe('');
        expect(fails({ output: probeOutput() }, '')).toBe(false);
      });

      it('accepts either alerts API privilege', () => {
        expect(missingFor(probeOutput({ api: ['api:alerts-all'] }))).toBe('');
        expect(
          missingFor(probeOutput({ api: ['api:alerts-signal-update-deprecated-privilege'] }))
        ).toBe('');
      });

      it('names each missing grant', () => {
        const output = probeOutput({
          api: ['api:alerts-all', 'api:alerts-signal-update-deprecated-privilege'],
          indices: {
            '.alerts-security.alerts-default': { maintenance: false },
            '.adhoc.alerts-security.attack.discovery.alerts-default': { index: false },
          },
        });
        const missing = missingFor(output);

        expect(missing).toBe(
          '; the Kibana privilege Security › Alerts: All' +
            '; the Elasticsearch index privileges `index` and `maintenance` on `.adhoc.alerts-security.attack.discovery.alerts-default`' +
            '; the Elasticsearch index privileges `index` and `maintenance` on `.alerts-security.alerts-default`'
        );
        expect(fails({ output }, missing)).toBe(true);
      });

      it('fails closed when the probe itself errors', () => {
        expect(fails({ error: { message: 'HTTP 503: unavailable' } }, '')).toBe(true);
      });

      it('fails with what the approver needs, before anything is closed', () => {
        expect(fail?.type).toBe('workflow.fail');
        const message = (probeStep: Record<string, unknown>, missing: string) =>
          render(fail?.with?.message, {
            steps: { probe_privileges: probeStep, resolve_privileges: { output: { missing } } },
          });

        const missing = missingFor(
          probeOutput({ indices: { '.alerts-security.alerts-default': { index: false } } })
        );
        expect(message({ output: {} }, missing)).toBe(
          'Nothing was closed: the approving account is missing the Elasticsearch index privileges `index` and `maintenance` on `.alerts-security.alerts-default`. ' +
            'Closing an Investigation also closes its attack and detection alerts, which needs the Kibana privilege Security › Alerts: All and the Elasticsearch index privileges `index` and `maintenance` on `.alerts-security.alerts-default`, `.alerts-security.attack.discovery.alerts-default` and `.adhoc.alerts-security.attack.discovery.alerts-default`. Ask an administrator to grant them to the account that approves, then approve again.'
        );

        expect(message({ error: { message: 'HTTP 503: unavailable' } }, '')).toContain(
          "Nothing was closed: the approving account's privileges could not be checked (HTTP 503: unavailable). Closing an Investigation"
        );
      });
    });

    it('retires the attack and its alerts first, then closes the Investigation over the status route', () => {
      const names = yaml.steps.map(({ name }) => name);
      expect(names).toEqual([
        'probe_privileges',
        'resolve_privileges',
        'fail_if_unprivileged',
        'close_attack_and_alerts',
        'journal_closed',
        'close_investigation',
        'emit_result',
      ]);

      const retire = stepByName(yaml, 'close_attack_and_alerts');
      expect(retire?.type).toBe('workflow.execute');
      // Approver identity, not a service account: see service_account_inheritance.test.ts.
      expect(retire?.with?.['run-as-mode']).toBeUndefined();
      // Not continued: a failed close is recorded on the proposal, and the bridge
      // offers the analyst a fresh card.
      expect((retire as { 'on-failure'?: unknown })?.['on-failure']).toBeUndefined();

      const close = stepByName(yaml, 'close_investigation');
      expect(close?.type).toBe('kibana.request');
      expect(close?.with).toEqual({
        method: 'PUT',
        path: '/s/{{ workflow.spaceId }}/internal/investigations/investigations/{{ inputs.actionInput.investigation_id }}/status',
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '1',
          'Content-Type': 'application/json',
        },
        body: { status: 'closed', expected_proposal_ids: [] },
      });
      expect(JSON.stringify(yaml)).not.toContain('ai.conversation.metadata.patch');
    });

    // The journal lives here, not in the shared child: the child cannot pick an
    // identity for a child of its own, and this action's identity is whoever
    // approved. No `run-as-mode`, like every other child call in an action.
    it('journals what the child read back, as the approver, before closing the Investigation', () => {
      const note = stepByName(yaml, 'journal_closed');
      expect(note?.type).toBe('workflow.execute');
      expect(note?.with?.['workflow-id']).toBe('system-alertzero-journal-note');
      expect(note?.with?.['run-as-mode']).toBeUndefined();
      expect((note as { 'on-failure'?: unknown })?.['on-failure']).toEqual({ continue: true });

      const inputs = note?.with?.inputs as { conversation_id: string; message: string };
      expect(inputs.conversation_id).toBe('{{ inputs.actionInput.investigation_id }}');
      expect(inputs.message).not.toContain('error');

      const render = (output: Record<string, number | boolean>) =>
        createWorkflowLiquidEngine().parseAndRenderSync(inputs.message, {
          inputs: { actionInput: { attack_discovery_id: 'ad-1', attack_reason: 'false_positive' } },
          execution: { id: 'exec-1' },
          steps: {
            close_attack_and_alerts: {
              output: {
                attack_found: true,
                attack_closed: true,
                alerts_requested: 4,
                alerts_read: true,
                alerts_closed: 3,
                alerts_open: 0,
                alerts_kept: 1,
                ...output,
              },
            },
          },
        });

      expect(render({})).toBe(
        'Closed the attack as `false_positive`. Closed 3 of its 4 detection alert(s) as `false_positive`. 1 also belong to another open attack and were left as they were.'
      );
      expect(render({ alerts_kept: 0, alerts_closed: 4 })).toBe(
        'Closed the attack as `false_positive`. Closed 4 of its 4 detection alert(s) as `false_positive`.'
      );
      expect(render({ alerts_closed: 2, alerts_open: 1 })).toContain(
        'Still open, because closing them did not land: 1. See execution `exec-1`.'
      );
      expect(render({ alerts_read: false })).toContain(
        'Could not read its 4 detection alert(s) back, so whether they were closed is unknown.'
      );
      expect(render({ alerts_requested: 0 })).toBe(
        'Closed the attack as `false_positive`. It lists no detection alerts.'
      );
      expect(render({ attack_closed: false })).toBe(
        'The attack could not be closed and was left as it was. See execution `exec-1`.'
      );
      expect(render({ attack_found: false })).toBe(
        'No Attack Discovery alert matching `ad-1` was found, so no attack or alerts were closed.'
      );
    });

    it('renders the Investigation id into the route path', () => {
      const close = stepByName(yaml, 'close_investigation');
      const path = createWorkflowLiquidEngine().parseAndRenderSync(String(close?.with?.path), {
        workflow: { spaceId: 'sec' },
        inputs: { actionInput: { investigation_id: 'inv-1' } },
      });
      expect(path).toBe('/s/sec/internal/investigations/investigations/inv-1/status');
    });
  });
});
