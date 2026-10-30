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
import { ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW } from './forensics_close_investigation_gate';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import {
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
} from './forensics_proposal_gate';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  if?: string;
  foreach?: string;
  condition?: string;
  mode?: string;
  concurrency?: { max?: number };
  'on-failure'?: {
    continue?: boolean;
    retry?: { 'max-attempts'?: number; delay?: string; strategy?: string };
  };
}

const definition = parse(ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW.yaml) as {
  name?: string;
  tags?: string[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
  triggers?: Array<{
    type: string;
    inputs?: {
      required?: string[];
      properties?: Record<string, { pattern?: string; maxLength?: number; enum?: string[] }>;
    };
  }>;
  consts?: Record<string, unknown>;
  steps: YamlStep[];
};

/** `maxLength` on the journal note's `message` input; see journal_note.yaml. */
const JOURNAL_MESSAGE_MAX_LENGTH = 8000;

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

const allSteps = flatten(definition.steps);
const stepByName = (name: string) => allSteps.find((step) => step.name === name);

const liquid = createWorkflowLiquidEngine();
// `data.set` authors `${{ }}` so the value stays a boolean instead of the string
// "true"; the delimiters are not part of what the engine evaluates.
const evaluate = (expression: string, context: Record<string, unknown>): unknown =>
  liquid.evalValueSync(
    expression
      .replace(/^\$?\{\{/, '')
      .replace(/\}\}$/, '')
      .trim(),
    context
  );

// `resolve_agent_result` runs after the agent, so a fixture that sets `forensic_analysis`
// gets the value the real step would compute from it.
const withAgentResult = ({
  steps,
  ...rest
}: {
  steps: Record<string, unknown>;
  [key: string]: unknown;
}) => ({
  ...rest,
  steps: {
    ...steps,
    resolve_agent_result: {
      output: {
        completed: evaluate(String(stepByName('resolve_agent_result')?.with?.completed), {
          steps,
        }),
      },
    },
  },
});

describe('Endpoint analysis run', () => {
  it('records the forensic execution on the verified investigation before processing it', () => {
    const validRequest = stepByName('when_ki_valid');
    expect(validRequest?.condition).toContain('steps.resolve_request.output.has_request == true');
    expect(validRequest?.condition).toContain('steps.verify_investigation.output.metadata != null');
    expect(validRequest?.steps?.[0]).toEqual({
      name: 'append_workflow_execution',
      type: 'investigations.appendWorkflowExecutionId',
      'on-failure': { continue: true },
      with: {
        conversationId: '{{ steps.resolve_request.output.investigation_id }}',
        workflowExecutionId: '{{ execution.id }}',
      },
    });
  });

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
  // to the space of the Worker that dispatched the run. The two aliases are the
  // complete set for that space; a trailing wildcard is not part of either name.
  it('scopes alert lookups to the dispatching space', () => {
    expect(stepByName('fetch_attack_discovery_alert')?.with?.index).toBe(
      '.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }},.adhoc.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }}'
    );
  });

  // Every default AI index resolves to one physical index shared by all spaces, and
  // this workflow is globally installed with a manual trigger, so `ki_id` alone is an
  // attacker-supplied pointer into every space's indicators. Without these filters a
  // caller in one space reads another space's handoff and retires it.
  describe('the Spaces boundary on the indicator read', () => {
    const readFilters = ((
      stepByName('read_ki')?.with?.query as { bool?: { filter?: unknown[] } } | undefined
    )?.bool?.filter ?? []) as Array<Record<string, Record<string, unknown>>>;

    const termValue = (field: string): unknown =>
      readFilters.find((clause) => clause.term?.[field] !== undefined)?.term?.[field];

    it('reads only an indicator belonging to the dispatching space', () => {
      expect(termValue('attributes.space_id')).toBe('{{ workflow.spaceId }}');
    });

    it('reads only an endpoint analysis indicator', () => {
      expect(termValue('type')).toBe('security.analyze_endpoint');
    });

    // The sweep only dispatches `pending`. Without the same term here, a re-dispatch
    // or a manual retry of an indicator that already settled would analyze it again.
    it('reads only an indicator the sweep would still dispatch', () => {
      expect(termValue('attributes.status')).toBe('pending');
    });

    // The sweep sends the logical `id`. An `ids` query matches document `_id`, which
    // on a data stream is a revision, so the child would find nothing. Documents
    // written before `id` existed still have to match `_id`.
    it('matches the logical id and falls back to _id only when id is absent', () => {
      const idClause = readFilters.find((clause) => clause.bool !== undefined)?.bool as
        | {
            should?: Array<Record<string, unknown>>;
            minimum_should_match?: number;
          }
        | undefined;
      expect(idClause?.minimum_should_match).toBe(1);
      expect(idClause?.should).toEqual([
        { term: { id: '{{ inputs.ki_id }}' } },
        {
          bool: {
            filter: [{ ids: { values: ['{{ inputs.ki_id }}'] } }],
            must_not: [{ exists: { field: 'id' } }],
          },
        },
      ]);
      expect(stepByName('read_ki')?.with?.sort).toEqual([
        { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
      ]);
    });

    // The filters have to sit on the read rather than on each write, because the read
    // is the single thing every later gate derives from. An id that fails them yields
    // no hits, which the conditions below already treat as nothing to act on.
    it('leaves a foreign indicator with no request to act on', () => {
      const noHits = { steps: { read_ki: { output: { hits: { hits: [] } } } } };
      expect(evaluate(String(stepByName('resolve_request')?.with?.has_request), noHits)).toBe(
        false
      );
      expect(
        liquid.parseAndRenderSync(
          String(stepByName('resolve_request')?.with?.investigation_id),
          noHits
        )
      ).toBe('');
    });

    // `mark_invalid` needs a document to have been found. `mark_unreachable` needs a
    // request whose investigation could not be read, which only a found document can
    // supply. A foreign id satisfies neither, so nothing is written.
    it('issues no terminal update for an indicator it could not read', () => {
      expect(stepByName('mark_invalid')?.if).toContain('steps.read_ki.output.hits.hits[0]._id');
      expect(stepByName('mark_unreachable')?.if).toContain(
        'steps.resolve_request.output.has_request == true'
      );
      expect(stepByName('mark_unreachable')?.if).toContain(
        'steps.verify_investigation.output.metadata == null'
      );

      const noHits = {
        steps: {
          read_ki: { output: { hits: { hits: [] } } },
          resolve_request: { output: { has_request: false } },
        },
      };
      expect(evaluate(String(stepByName('mark_invalid')?.if), noHits)).toBe(false);
      expect(evaluate(String(stepByName('mark_unreachable')?.if), noHits)).toBe(false);
    });

    // The dispatcher selects on the same type, space, and status. If either side changed
    // its mind about how an indicator is identified, the sweep would keep handing over
    // work the child then refused to read, and the indicator would never retire.
    it('matches the fields the dispatcher selects on', () => {
      const sweepQuery = JSON.stringify(
        (
          parse(FORENSICS_ENDPOINT_ANALYSIS_YAML) as {
            steps: Array<{ name: string; with?: { query?: unknown } }>;
          }
        ).steps.find(({ name }) => name === 'search_pending_indicators')?.with?.query
      );
      expect(sweepQuery).toContain('security.analyze_endpoint');
      expect(sweepQuery).toContain('attributes.space_id');
      expect(sweepQuery).toContain('attributes.status');
      expect(termValue('type')).toBe('security.analyze_endpoint');
      expect(termValue('attributes.space_id')).toBe('{{ workflow.spaceId }}');
      expect(termValue('attributes.status')).toBe('pending');
    });
  });

  it('marks the indicator processed only after a valid request that wrote something', () => {
    const mark = stepByName('mark_processed');
    expect(mark?.type).toBe('context-engine.updateKi');
    expect(mark?.if).toContain('steps.resolve_request.output.has_request == true');
    expect(mark?.if).toContain('steps.verify_investigation.output.metadata != null');
    expect(mark?.if).toContain('steps.resolve_run_outcome.output.settled == true');
    expect(mark?.if).toContain('steps.resolve_run_outcome.output.outcome_unrecorded != true');
    expect(mark?.with).toEqual(
      expect.objectContaining({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
      })
    );
  });

  describe('a run that writes nothing to the investigation', () => {
    it('is retired as failed rather than processed', () => {
      const markFailed = stepByName('mark_failed');
      expect(markFailed?.type).toBe('context-engine.updateKi');
      expect(markFailed?.if).toContain('steps.resolve_run_outcome.output.settled != true');
      expect(markFailed?.with).toEqual({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
        ki: {
          attributes: {
            status: 'failed',
            failure_reason:
              'No findings reached investigation {{ steps.resolve_request.output.investigation_id }}',
          },
        },
      });
    });

    it('retires a run that had no host to analyze as processed, not failed', () => {
      const settled = String(stepByName('resolve_run_outcome')?.with?.settled);
      expect(settled).toContain('steps.resolve_host.output.host_name == blank');

      const attached = String(stepByName('resolve_run_outcome')?.with?.attached);
      expect(attached).not.toContain('host_name');
      expect(attached).not.toContain('telemetry');
    });

    it('leaves no valid request on a status the sweep still selects', () => {
      const statuses = [
        'mark_processed',
        'mark_failed',
        'mark_proposals_failed',
        'mark_invalid',
      ].map(
        (name) => (stepByName(name)?.with?.ki as { attributes?: { status?: string } })?.attributes
      );
      expect(statuses.map((attributes) => attributes?.status)).toEqual([
        'processed',
        'failed',
        'failed',
        'invalid',
      ]);
      expect(stepByName('mark_processed')?.if).toContain('settled == true');
      expect(stepByName('mark_failed')?.if).toContain('settled != true');
    });

    it('reads back every attachment the valid path can write', () => {
      const attached = String(stepByName('resolve_run_outcome')?.with?.attached);
      const attachmentIds = allSteps
        .filter(({ type }) => type === 'ai.attachment.add')
        .map(({ with: withInputs }) => (withInputs as { id?: string })?.id);

      expect(attachmentIds).toEqual([
        '{{ steps.finding_ids.output.timeline }}',
        '{{ steps.finding_ids.output.iocs }}',
      ]);
      for (const id of attachmentIds) {
        const reference = String(id)
          .replace(/^\{\{\s*/, '')
          .replace(/\s*\}\}$/, '');
        expect(attached).toContain(`contains ${reference}`);
      }
    });

    // An attachment renders when the agent references it, and on this path no agent ever
    // runs against the investigation — the forensic agent is ephemeral and the notes use
    // `trigger_mode: never`. Every finding therefore has to ask for itself, or the run
    // leaves an investigation that shows nothing it found.
    it('renders every finding without waiting for an agent to reference it', () => {
      const adds = allSteps.filter(({ type }) => type === 'ai.attachment.add');

      expect(adds).not.toHaveLength(0);
      for (const { with: withInputs } of adds) {
        expect((withInputs as { render_inline?: boolean })?.render_inline).toBe(true);
      }
    });

    // The adds continue past the 409 a re-run raises against the fixed ids, so on exactly
    // the runs where the findings DO exist they emit no id. Gating on that would retire a
    // repeat of a complete analysis as failed.
    it('does not infer what landed from the add steps', () => {
      const outcome = JSON.stringify(stepByName('resolve_run_outcome')?.with);
      expect(outcome).not.toContain('attachment_id');
    });

    it('reports whether anything was attached so a handoff can be desk-tested', () => {
      expect(stepByName('emit_result')?.with?.attachments_written).toBe(
        '${{ steps.resolve_run_outcome.output.attached == true }}'
      );
    });
  });

  // The expressions that pick a terminal status, evaluated rather than matched. Every
  // assertion above reads their source text, which cannot answer what they return: these
  // are `blank` comparisons and `!= null` checks over a document that may not exist, and
  // a missing indicator leaves every operand undefined. Whether that reads as false or
  // throws is a property of Liquid, not of the string.
  describe('the expressions that decide the outcome', () => {
    const hasRequest = (attributes: Record<string, string> | null): unknown =>
      evaluate(String(stepByName('resolve_request')?.with?.has_request), {
        steps: {
          read_ki: {
            output: { hits: { hits: attributes === null ? [] : [{ _source: { attributes } }] } },
          },
        },
      });

    it('treats an indicator naming both an alert and an investigation as a request', () => {
      expect(
        hasRequest({
          attack_discovery_alert_id: '50e2f8aef56286bd953f8e0e1f72b9dd',
          investigation_id: 'an-investigation',
        })
      ).toBe(true);
    });

    it.each([
      ['names no investigation', { attack_discovery_alert_id: 'an-alert', investigation_id: '' }],
      ['names no alert', { attack_discovery_alert_id: '', investigation_id: 'an-investigation' }],
    ])('rejects an indicator that %s', (_case, attributes) => {
      expect(hasRequest(attributes)).toBe(false);
    });

    // `read_ki` continues past zero hits instead of failing, so on a deleted indicator
    // every operand is undefined. It has to evaluate to false rather than throw, or the
    // run takes the valid branch and spends 30m attaching to an investigation it never
    // resolved.
    it('rejects an indicator that no longer exists', () => {
      expect(hasRequest(null)).toBe(false);
    });

    it('keys each finding id with the indicator', () => {
      const render = (field: string) =>
        liquid.parseAndRenderSync(String(stepByName('finding_ids')?.with?.[field]), {
          inputs: { ki_id: 'ki-1' },
        });

      expect(render('timeline')).toBe('forensic-timeline-ki-1');
      expect(render('iocs')).toBe('forensic-iocs-ki-1');
    });

    const thisIndicator = {
      timeline: 'forensic-timeline-ki-1',
      iocs: 'forensic-iocs-ki-1',
    };
    const outcome = (
      field: 'attached' | 'settled' | 'analyzed',
      found: {
        ids?: string[];
        hostName?: string;
        telemetry?: { checked: boolean; present: boolean };
        analyzed?: boolean;
        agentFailed?: boolean;
      }
    ): unknown =>
      evaluate(
        String(stepByName('resolve_run_outcome')?.with?.[field]),
        withAgentResult({
          steps: {
            ...(found.analyzed ? { forensic_analysis: { output: { structured_output: {} } } } : {}),
            // A failed agent step keeps the partial output the handler returns with its error.
            ...(found.agentFailed
              ? {
                  forensic_analysis: {
                    error: { message: 'boom' },
                    output: { message: '', metadata: { usage: {} } },
                  },
                }
              : {}),
            finding_ids: { output: thisIndicator },
            resolve_written_findings: { output: { ids: found.ids } },
            resolve_host: { output: { host_name: found.hostName } },
            resolve_endpoint_telemetry: { output: found.telemetry ?? {} },
          },
        })
      );

    it('settles a run whose timeline and indicators for this indicator are on the investigation', () => {
      const ids = [thisIndicator.timeline, thisIndicator.iocs];
      expect(outcome('settled', { ids, hostName: 'host-a' })).toBe(true);
      expect(outcome('attached', { ids, hostName: 'host-a' })).toBe(true);
    });

    // Without agent output in this run, one finding is an earlier run's work. It settles
    // as an unrecorded outcome rather than reading as "no analysis": that run may have
    // journaled its verdict and raised proposals with only the IoCs attached.
    it('settles a partial write from an earlier run, without claiming it attached both', () => {
      expect(outcome('settled', { ids: [thisIndicator.iocs], hostName: 'host-a' })).toBe(true);
      expect(outcome('settled', { ids: [thisIndicator.timeline], hostName: 'host-a' })).toBe(true);
      expect(
        outcome('attached', {
          ids: [thisIndicator.timeline],
          hostName: 'host-a',
        })
      ).toBe(false);
    });

    // The findings share a conversation with whatever else the investigation collected,
    // including another indicator's forensic files, so the outcome has to key off the
    // ids this run writes.
    it('ignores attachments this run did not write', () => {
      expect(
        outcome('attached', {
          ids: [
            'attack-discovery',
            'alerts',
            'forensic-timeline-ki-2',
            'forensic-iocs-ki-2',
            'forensic-assessment-ki-2',
          ],
          hostName: 'host-a',
        })
      ).toBe(false);
      expect(
        outcome('settled', {
          ids: ['forensic-timeline-ki-2', 'forensic-iocs-ki-2', 'forensic-assessment-ki-2'],
          hostName: 'host-a',
        })
      ).toBe(false);
    });

    // The failure this whole gate exists for: a host to analyze, and no analysis finished.
    it('does not settle a run that had a host but no analysis', () => {
      expect(outcome('settled', { ids: [], hostName: 'host-a' })).toBe(false);
      expect(outcome('attached', { ids: [], hostName: 'host-a' })).toBe(false);
      expect(outcome('analyzed', { ids: [], hostName: 'host-a' })).toBe(false);
    });

    // The verdict, the assessment and the containment rest on the agent output, so a
    // rejected attachment is journaled and the analysis still counts. `attached` stays
    // false: it is the marker a later run uses to skip the agent.
    it('settles a run whose agent finished even when an attachment was rejected', () => {
      for (const ids of [[], [thisIndicator.iocs], [thisIndicator.timeline]]) {
        expect(outcome('settled', { ids, hostName: 'host-a', analyzed: true })).toBe(true);
        expect(outcome('analyzed', { ids, hostName: 'host-a', analyzed: true })).toBe(true);
        expect(outcome('attached', { ids, hostName: 'host-a', analyzed: true })).toBe(false);
      }
    });

    // A failed agent step still carries partial output next to its error. It is not an
    // analysis: the run is neither analyzed nor settled, so it is journaled and retired
    // as failed instead of asking a close question on a verdict nobody reached.
    it('does not count a failed agent, whatever partial output it left', () => {
      for (const ids of [[], [thisIndicator.iocs]]) {
        const found = { ids, hostName: 'host-a', agentFailed: true };
        expect(outcome('analyzed', found)).toBe(false);
        expect(outcome('attached', found)).toBe(false);
      }
      expect(outcome('settled', { ids: [], hostName: 'host-a', agentFailed: true })).toBe(false);
      // An agent that returned no structured output did not finish either.
      expect(
        evaluate(String(stepByName('resolve_agent_result')?.with?.completed), {
          steps: { forensic_analysis: { output: { message: '' } } },
        })
      ).toBe(false);
    });

    // Retired as processed, not failed. A missing read is a 404 here rather than a fault,
    // and no later run resolves a host the discovery does not name.
    it('settles a run that had no host to analyze without claiming it attached anything', () => {
      expect(outcome('settled', { ids: [] })).toBe(true);
      expect(outcome('attached', { ids: [] })).toBe(false);
    });

    // Same shape as no host: the agent never ran because there was nothing for it to
    // read, and no retry ships telemetry the host never sent.
    it('settles a run whose host has no Defend telemetry without claiming it attached anything', () => {
      const none = { checked: true, present: false };
      expect(outcome('settled', { ids: [], hostName: 'host-a', telemetry: none })).toBe(true);
      expect(outcome('attached', { ids: [], hostName: 'host-a', telemetry: none })).toBe(false);
    });

    // A run that skipped the check (findings already attached, or a recorded attempt)
    // has no telemetry answer, and must not be settled by the absence of one.
    it('does not read a telemetry check it skipped as no telemetry', () => {
      const skipped = { checked: false, present: false };
      expect(outcome('settled', { ids: [], hostName: 'host-a', telemetry: skipped })).toBe(false);
      expect(outcome('settled', { ids: [], hostName: 'host-a' })).toBe(false);
      const some = { checked: true, present: true };
      expect(outcome('settled', { ids: [], hostName: 'host-a', telemetry: some })).toBe(false);
    });
  });

  // A 30m agent run against an investigation that is gone produces three attachment
  // failures that look exactly like a rejected payload. Reading it first turns that into
  // one cheap, named outcome — and does it before the money is spent.
  describe('an investigation that cannot be read', () => {
    it('is checked before the agent runs, not discovered by failing to write', () => {
      const verify = stepByName('verify_investigation');
      expect(verify?.type).toBe('ai.conversation.metadata.read');
      expect(verify?.if).toContain('investigation_id != blank');

      const topLevel = definition.steps.map(({ name }) => name);
      expect(topLevel.indexOf('verify_investigation')).toBeLessThan(
        topLevel.indexOf('when_ki_valid')
      );
      expect(stepByName('when_ki_valid')?.condition).toContain(
        'steps.verify_investigation.output.metadata != null'
      );
    });

    // The Attack Discovery review lets this one fail the run outright. Here that would
    // leave the indicator `pending`, which the sweep re-selects every minute.
    it('continues rather than failing the run, so the indicator is never left pending', () => {
      expect(stepByName('verify_investigation')?.['on-failure']).toEqual({ continue: true });

      const markUnreachable = stepByName('mark_unreachable');
      expect(markUnreachable?.type).toBe('context-engine.updateKi');
      expect(definition.steps.map(({ name }) => name)).toContain('mark_unreachable');
      expect(stepByName('when_ki_valid')?.else?.map(({ name }) => name)).not.toContain(
        'mark_unreachable'
      );
      expect(markUnreachable?.if).toContain('steps.resolve_request.output.has_request == true');
      expect(markUnreachable?.if).toContain('steps.verify_investigation.output.metadata == null');
      expect(
        (markUnreachable?.with?.ki as { attributes?: { status?: string } })?.attributes
      ).toEqual({
        status: 'failed',
        failure_reason:
          'Could not read investigation {{ steps.resolve_request.output.investigation_id }}',
      });
    });

    // A malformed indicator is retired only as invalid. The unreachable write is a
    // separate step, and its condition is the opposite of this one, so the two cannot
    // both update the same indicator.
    it('is told apart from a malformed indicator', () => {
      expect(stepByName('when_ki_valid')?.else?.map(({ name }) => name)).toEqual([
        'journal_invalid_request',
        'mark_invalid',
      ]);
      expect(stepByName('mark_invalid')?.if).toContain(
        'steps.resolve_request.output.has_request != true'
      );
      expect(stepByName('mark_unreachable')?.if).toContain(
        'steps.resolve_request.output.has_request == true'
      );
      expect(stepByName('journal_invalid_request')?.if).toContain(
        'steps.resolve_request.output.has_request != true'
      );

      const found = {
        read_ki: { output: { hits: { hits: [{ _id: 'ki-1' }] } } },
      };
      const malformed = {
        steps: {
          ...found,
          resolve_request: { output: { has_request: false } },
          verify_investigation: { output: { metadata: null } },
        },
      };
      const unreachable = {
        steps: {
          ...found,
          resolve_request: { output: { has_request: true } },
          verify_investigation: { output: { metadata: null } },
        },
      };
      expect(evaluate(String(stepByName('mark_invalid')?.if), malformed)).toBe(true);
      expect(evaluate(String(stepByName('mark_unreachable')?.if), malformed)).toBe(false);
      expect(evaluate(String(stepByName('mark_invalid')?.if), unreachable)).toBe(false);
      expect(evaluate(String(stepByName('mark_unreachable')?.if), unreachable)).toBe(true);
    });
  });

  // A `type: text` attachment was how this run used to narrate itself, which put prose an
  // analyst scans in the same rail as the evidence they open. `trigger_mode: never` gives
  // it a place to go that does not wake the investigation's agent.
  describe('what it says about itself versus what it attaches', () => {
    const journalSteps = allSteps.filter(
      ({ with: withInputs }) =>
        (withInputs as { 'workflow-id'?: string } | undefined)?.['workflow-id'] ===
        'system-alertzero-journal-note'
    );

    it('narrates problem paths and the assessment as journal notes rather than attachments', () => {
      expect(journalSteps.map(({ name }) => name).sort()).toEqual([
        'journal_analysis_problem',
        'journal_analysis_started',
        'journal_attack_alerts',
        'journal_close_question',
        'journal_fetch_alert_problem',
        'journal_findings_not_attached',
        'journal_invalid_request',
        'journal_iocs',
        'journal_no_host',
        'journal_no_telemetry',
        'journal_outcome_unrecorded',
        'journal_proposals_lost',
        'journal_proposals_queued',
        'journal_rationale',
        'journal_timeline',
        'journal_verdict_dropped_actions',
        'write_convergence_note',
      ]);
      expect(
        journalSteps.every(({ with: withInputs }) => withInputs?.['run-as-mode'] === 'inherit')
      ).toBe(true);
    });

    // A missing discovery alert is narrated and then falls through to the no-host
    // branch, so both notes are reachable on one execution. They describe different
    // causes, and the one that blames the host is wrong about a discovery that was
    // never found, so the run has to pick exactly one.
    it('narrates a short-circuit once, naming the cause it actually hit', () => {
      const whenAlertIs = (hits: Array<{ _id: string }>) => ({
        steps: { fetch_attack_discovery_alert: { output: { hits: { hits } } } },
      });
      const fires = (step: string, hits: Array<{ _id: string }>): unknown =>
        evaluate(String(stepByName(step)?.if), whenAlertIs(hits));

      expect(fires('journal_fetch_alert_problem', [])).toBe(true);
      expect(fires('journal_no_host', [])).toBe(false);

      expect(fires('journal_fetch_alert_problem', [{ _id: 'ad-1' }])).toBe(false);
      expect(fires('journal_no_host', [{ _id: 'ad-1' }])).toBe(true);
    });

    // Silencing the second note must not change which indicators retire: a discovery
    // that cannot yield a host settles the run either way, and that decision reads the
    // resolved host rather than whether a note was written.
    it('decides retirement from the resolved host, not from the note it wrote', () => {
      expect(String(stepByName('resolve_run_outcome')?.with?.settled)).toContain(
        'steps.resolve_host.output.host_name == blank'
      );
      expect(String(stepByName('resolve_run_outcome')?.with?.settled)).not.toContain('journal');
    });

    // Timeline and IoCs stay attachments: they carry a payload a domain type validates,
    // and the run's terminal status depends on them landing, which a note returning no
    // id cannot report. The assessment is prose and goes to the journal instead.
    it('keeps the timeline and indicators as attachments', () => {
      expect(
        allSteps.filter(({ type }) => type === 'ai.attachment.add').map(({ name }) => name)
      ).toEqual(['attach_timeline', 'attach_iocs']);
    });

    // `system-alertzero-journal-note` bounds `message` at 8000 characters and rejects a
    // longer one whole. The note prefixes the assessment, and a blank line keeps the
    // first markdown block on its own line. The schema cap stays under that bound
    // for either label.
    it('caps the assessment at the length a journal note can carry', () => {
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        properties?: { rationale?: { maxLength?: number } };
      };
      const journal = stepByName('journal_rationale');
      const rationaleCap = schema?.properties?.rationale?.maxLength ?? 0;
      const message = (journal?.with as { inputs?: { message?: string } })?.inputs?.message ?? '';
      const rendered = (verdict: string | undefined) =>
        liquid.parseAndRenderSync(message, {
          steps: {
            forensic_analysis: {
              output: { structured_output: { verdict, rationale: 'x'.repeat(rationaleCap) } },
            },
          },
        });

      expect(rationaleCap).toBe(7900);
      expect(journal?.type).toBe('workflow.execute');
      expect((journal?.with as { 'workflow-id'?: string })?.['workflow-id']).toBe(
        'system-alertzero-journal-note'
      );
      expect(message).toContain('{{ steps.forensic_analysis.output.structured_output.rationale }}');
      for (const verdict of ['confirmed_incident', 'not_an_incident', 'unclear', undefined]) {
        expect(rendered(verdict).length).toBeLessThanOrEqual(JOURNAL_MESSAGE_MAX_LENGTH);
      }
    });

    // The journal has to show what Endpoint analysis concluded before it shows why:
    // a false positive the analysis determined is read off the heading.
    it('heads the assessment with the verdict', () => {
      const message = String(
        (stepByName('journal_rationale')?.with as { inputs?: { message?: string } })?.inputs
          ?.message
      );
      const rendered = (verdict?: string) =>
        liquid.parseAndRenderSync(message, {
          steps: {
            forensic_analysis: {
              output: { structured_output: { verdict, rationale: 'Benign admin tooling.' } },
            },
          },
        });

      expect(rendered('not_an_incident')).toBe(
        '# Endpoint analysis verdict: not an incident\n\nBenign admin tooling.'
      );
      expect(rendered('confirmed_incident')).toBe(
        '# Endpoint analysis verdict: confirmed incident\n\nBenign admin tooling.'
      );
      expect(rendered('unclear')).toBe(
        '# Endpoint analysis verdict: unclear\n\nBenign admin tooling.'
      );
      expect(rendered(undefined)).toBe(
        '# Endpoint analysis verdict: unclear\n\nBenign admin tooling.'
      );
      expect(message).not.toContain('Rationale for');
    });

    // The three notes before the agent are the only record of why this run stopped.
    // A failed note fails the run and leaves the indicator pending for a cheap retry.
    // Notes beside a retirement still continue, so a rejected note cannot block the
    // write that stops the sweep.
    it('fails the run when a note before the agent is lost', () => {
      expect(stepByName('journal_fetch_alert_problem')?.['on-failure']).toBeUndefined();
      expect(stepByName('journal_no_host')?.['on-failure']).toBeUndefined();
      expect(stepByName('journal_no_telemetry')?.['on-failure']).toBeUndefined();
      expect(stepByName('journal_invalid_request')?.['on-failure']).toEqual({ continue: true });
      expect(stepByName('journal_analysis_problem')?.['on-failure']).toEqual({ continue: true });
      // Before the agent, but a rejected note must not skip the 30m run.
      expect(stepByName('journal_analysis_started')?.['on-failure']).toEqual({ continue: true });
      expect(stepByName('journal_analysis_started')?.if).toBe(stepByName('forensic_analysis')?.if);
    });
  });

  // "Analyzed the host and found nothing" is a real result, and a different one from
  // "produced nothing". Keeping the two apart is what stops a clean run being retired as
  // failed, and what stops a broken one being retired as processed.
  describe('an analysis that found nothing', () => {
    // Both attachment types render a purpose-built empty state, so an empty payload is a
    // finding an analyst reads rather than an attachment worth suppressing. A size check on
    // either guard would leave the investigation silent, and silent reads as "never
    // analyzed" — on the one question this run was dispatched to answer.
    it('attaches the reconstruction and the indicators even when both are empty', () => {
      const [timeline, iocs] = ['attach_timeline', 'attach_iocs'].map((name) =>
        String(stepByName(name)?.if)
      );

      expect(timeline).toContain('structured_output.timeline != null');
      expect(iocs).toContain('structured_output.iocs != null');
      for (const guard of [timeline, iocs]) {
        expect(guard).not.toMatch(/size|length|> 0/);
      }
    });

    // The empty-state sentence on the attachment is the "found nothing" record. Each
    // note follows its card, only when that finding has something in it and the card
    // landed, so the journal never announces a finding the investigation does not have.
    // A rejected note must not skip the attachment.
    it('journals each finding separately, and only when it is nonempty and attached', () => {
      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('attach_timeline')).toBeLessThan(names.indexOf('journal_timeline'));
      expect(names.indexOf('journal_timeline')).toBeLessThan(names.indexOf('attach_iocs'));
      expect(names.indexOf('attach_iocs')).toBeLessThan(names.indexOf('journal_iocs'));
      expect(stepByName('journal_timeline')?.['on-failure']).toEqual({ continue: true });
      expect(stepByName('journal_iocs')?.['on-failure']).toEqual({ continue: true });
      expect(stepByName('attach_timeline')?.if).not.toBe(stepByName('journal_timeline')?.if);
      expect(stepByName('attach_iocs')?.if).not.toBe(stepByName('journal_iocs')?.if);

      const timeline = String(stepByName('resolve_finding_presence')?.with?.timeline);
      const iocs = String(stepByName('resolve_finding_presence')?.with?.iocs);
      const output = (events: unknown[], indicators: Record<string, unknown[]>) => ({
        steps: {
          forensic_analysis: {
            output: { structured_output: { timeline: { events }, iocs: indicators } },
          },
        },
      });

      expect(evaluate(timeline, output([], {}))).toBe(false);
      expect(evaluate(timeline, output([{ timestamp: 't' }], {}))).toBe(true);
      expect(evaluate(iocs, output([], {}))).toBe(false);
      expect(evaluate(iocs, output([], { ips: [{ value: '1.2.3.4' }] }))).toBe(true);
      expect(evaluate(iocs, output([], { shas: [], file_paths: [{ value: '/tmp/a' }] }))).toBe(
        true
      );

      const when = (hasTimeline: boolean, hasIocs: boolean) => ({
        steps: { resolve_finding_presence: { output: { timeline: hasTimeline, iocs: hasIocs } } },
      });
      expect(evaluate(String(stepByName('journal_timeline')?.if), when(true, false))).toBe(true);
      expect(evaluate(String(stepByName('journal_timeline')?.if), when(false, true))).toBe(false);
      expect(evaluate(String(stepByName('journal_iocs')?.if), when(false, true))).toBe(true);
      expect(evaluate(String(stepByName('journal_iocs')?.if), when(true, false))).toBe(false);
      const rejected = (step: string) => ({
        steps: { ...when(true, true).steps, [step]: { error: { message: 'rejected' } } },
      });
      expect(
        evaluate(String(stepByName('journal_timeline')?.if), rejected('attach_timeline'))
      ).toBe(false);
      expect(evaluate(String(stepByName('journal_iocs')?.if), rejected('attach_iocs'))).toBe(false);
      expect(evaluate(String(stepByName('journal_iocs')?.if), rejected('attach_timeline'))).toBe(
        true
      );

      const message = (name: string) =>
        (stepByName(name)?.with as { inputs?: { message?: string } })?.inputs?.message ?? '';
      expect(liquid.parseAndRenderSync(message('journal_timeline'), {})).toContain(
        'Reconstructed forensic timeline'
      );
      expect(liquid.parseAndRenderSync(message('journal_iocs'), {})).toContain(
        'Extracted IoCs during forensic analysis'
      );
    });

    // A rejected card would otherwise read as "found nothing". The note says which finding
    // is missing, and that the analysis itself finished.
    it('says which finding could not be attached', () => {
      const step = stepByName('journal_findings_not_attached');
      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('attach_iocs')).toBeLessThan(
        names.indexOf('journal_findings_not_attached')
      );
      expect(names.indexOf('journal_findings_not_attached')).toBeLessThan(
        names.indexOf('journal_rationale')
      );
      expect(step?.['on-failure']).toEqual({ continue: true });

      const context = (timelineRejected: boolean, iocsRejected: boolean) =>
        withAgentResult({
          execution: { id: 'exec-1', url: 'https://kibana/exec-1' },
          steps: {
            resolve_host: { output: { host_name: 'host-a' } },
            forensic_analysis: { output: { structured_output: {} } },
            attach_timeline: timelineRejected ? { error: { message: 'rejected' } } : { output: {} },
            attach_iocs: iocsRejected ? { error: { message: 'rejected' } } : { output: {} },
          },
        });
      const condition = String(step?.if);
      expect(evaluate(condition, context(false, false))).toBe(false);
      expect(evaluate(condition, context(true, false))).toBe(true);
      expect(evaluate(condition, context(false, true))).toBe(true);
      // No agent output: `journal_analysis_problem` speaks for the run instead.
      expect(
        evaluate(condition, { steps: { attach_timeline: { error: { message: 'rejected' } } } })
      ).toBe(false);

      const message = String((step?.with?.inputs as { message?: string } | undefined)?.message);
      const render = (timelineRejected: boolean, iocsRejected: boolean) =>
        liquid
          .parseAndRenderSync(message, context(timelineRejected, iocsRejected))
          .replace(/\s+/g, ' ');
      expect(render(true, false)).toBe(
        'The forensic timeline for `host-a` could not be attached to this investigation. The analysis itself finished. [See execution](https://kibana/exec-1).'
      );
      expect(render(false, true)).toContain('The indicators of compromise for `host-a`');
      expect(render(true, true)).toContain(
        'The forensic timeline and the indicators of compromise for `host-a`'
      );
    });

    // With both findings allowed to be empty, the assessment is the only output that
    // evidences the turn happened at all. Listing it as required does not get there: an
    // empty string satisfies `required`, and `journal_rationale` skips on blank — which
    // would leave a completed analysis with no assessment on the investigation.
    it('requires an assessment with something in it', () => {
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        required?: string[];
        properties?: { rationale?: { minLength?: number; description?: string } };
      };

      expect(schema?.required).toContain('rationale');
      expect(schema?.properties?.rationale?.minLength).toBeGreaterThan(0);
      expect(stepByName('journal_rationale')?.if).toContain('rationale != blank');
    });

    // The journal renders this note as markdown. The sentences stay in the same
    // controlled language coverage, rule creation, and rule tuning ask for.
    it('asks for the assessment as markdown in simplified technical English', () => {
      const message = String(stepByName('forensic_analysis')?.with?.message);
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        properties?: { rationale?: { description?: string } };
      };

      expect(message).toContain(
        'Write `rationale` as markdown, in ASD-STE100 Simplified Technical English.'
      );
      expect(message).toContain('`## Affected hosts`');
      expect(message).toContain('`## Data gaps`');
      expect(message).toContain('Do not list the actions.');
      expect(message).not.toContain('`## Recommended actions`');
      expect(schema?.properties?.rationale?.description).toContain(
        'markdown in ASD-STE100 Simplified Technical English'
      );
      expect(schema?.properties?.rationale?.description).not.toContain('`## Recommended actions`');
    });

    // `attach_timeline` and `attach_iocs` hand these payloads straight to attachment
    // types that declare every required string `min(1)`. A field bounded only above
    // therefore accepts an empty string here and is rejected there, and because the
    // attach steps continue on failure the run reaches `resolve_run_outcome` having
    // silently dropped a finding — partial on the investigation, or retired as failed
    // when all three went. The attachment schemas live in `security_solution` and this
    // package cannot import them, so the invariant is asserted structurally: anything
    // the model must supply has to be bounded at both ends.
    it('bounds every required finding string the attachment types reject when blank', () => {
      interface SchemaNode {
        type?: string;
        required?: string[];
        properties?: Record<string, SchemaNode>;
        items?: SchemaNode;
        minLength?: number;
        maxLength?: number;
      }

      const unbounded: string[] = [];
      const walk = (node: SchemaNode | undefined, path: string): void => {
        if (!node) return;
        walk(node.items, `${path}[]`);
        for (const name of node.required ?? []) {
          const field = node.properties?.[name];
          if (field?.type === 'string' && !(field.minLength && field.minLength > 0)) {
            unbounded.push(`${path}.${name}`);
          }
        }
        for (const [name, child] of Object.entries(node.properties ?? {})) {
          walk(child, `${path}.${name}`);
        }
      };

      const schema = stepByName('forensic_analysis')?.with?.schema as SchemaNode;
      walk(schema?.properties?.timeline, 'timeline');
      walk(schema?.properties?.iocs, 'iocs');

      expect(unbounded).toEqual([]);
    });

    // The rest of the mirror. These bounds are the attachment types' own, so a change on
    // either side that is not made on both shows up here rather than at runtime.
    it('matches the caps the attachment types enforce', () => {
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        properties?: Record<string, Record<string, Record<string, Record<string, unknown>>>>;
      };
      const timelineEvents = schema?.properties?.timeline?.properties?.events;
      const iocCategories = Object.values(schema?.properties?.iocs?.properties ?? {});

      expect(timelineEvents?.maxItems).toBe(50);
      expect(iocCategories).not.toHaveLength(0);
      for (const category of iocCategories) {
        expect(category.maxItems).toBe(50);
      }
    });
  });

  // Two ways a run ends without doing its job: it could not learn what to analyze, or it
  // could not record that it had. Both used to end quietly — the first as a successful
  // run, the second as a completed one that had just started a week-long loop.
  describe('a run that cannot finish its job', () => {
    // A read error is a gap, not an answer. Continuing past one hands `resolve_host` a
    // blank host, which is indistinguishable from "the discovery names no host" and
    // retires the indicator as processed — discarding the handoff over a blip. `read_ki`
    // already failed for this reason; the other two now match it, and the retry is cheap
    // because every lookup runs before the agent does.
    it('fails rather than reading an unavailable index as an empty answer', () => {
      const lookups = [
        'read_ki',
        'fetch_attack_discovery_alert',
        'extract_host_from_ad_constituent_alerts',
      ];

      for (const name of lookups) {
        expect(stepByName(name)).toBeDefined();
        expect(stepByName(name)?.['on-failure']).toBeUndefined();
      }
      // Nothing is left for the note to say about an error, so it describes only what it
      // still covers: a discovery that genuinely is not there, which no retry fixes.
      expect(stepByName('journal_fetch_alert_problem')?.if).not.toContain('error');
    });

    // An indicator left `pending` is re-dispatched every minute for the rest of the
    // lookback window. Swallowing the write that prevents that reports a completed run
    // while the loop starts. The attempt marker is the same kind of write: if it fails
    // quietly, the agent still runs, and the next sweep has no record that it did.
    it('does not swallow the write that stops the indicator being re-dispatched', () => {
      const writes = allSteps.filter(({ type }) => type === 'context-engine.updateKi');

      expect(writes.map(({ name }) => name).sort()).toEqual([
        'mark_attempted',
        'mark_failed',
        'mark_invalid',
        'mark_outcome_unrecorded',
        'mark_processed',
        'mark_proposals_failed',
        'mark_unreachable',
      ]);
      for (const step of writes) {
        expect(step['on-failure']?.continue).toBeUndefined();
      }
    });

    // The verdict after the agent exists only in this run's output. A retry skips the
    // agent and cannot reconstruct it, so losing the write to a short blip in the
    // context engine loses the verdict. These writes try again in place before the run
    // gives up; the pre-agent writes do not need to, since their retry is the next sweep.
    it('retries the writes that record a verdict before failing the run', () => {
      const retry = { 'max-attempts': 3, delay: '5s', strategy: 'exponential' };

      for (const name of [
        'mark_processed',
        'mark_failed',
        'mark_proposals_failed',
        'mark_outcome_unrecorded',
      ]) {
        expect(stepByName(name)?.['on-failure']).toEqual({ retry });
      }
      expect(stepByName('mark_attempted')?.['on-failure']).toBeUndefined();
      expect(stepByName('mark_invalid')?.['on-failure']).toBeUndefined();
      expect(stepByName('mark_unreachable')?.['on-failure']).toBeUndefined();
    });

    // A retry finds both findings already attached and skips the agent. Without the
    // agent's output it cannot tell whether the earlier run's assessment note landed or
    // its proposals were queued, so claiming `processed` would turn a lost proposal
    // into a success. It says what it knows and retires the indicator as failed.
    it('does not claim processed for an earlier run whose verdict was never recorded', () => {
      const thisIndicator = { timeline: 'forensic-timeline-ki-1', iocs: 'forensic-iocs-ki-1' };
      const unrecorded = String(stepByName('resolve_run_outcome')?.with?.outcome_unrecorded);
      const unrecordedWhen = (ids: string[], agentOutput?: Record<string, unknown>): unknown =>
        evaluate(
          unrecorded,
          withAgentResult({
            steps: {
              finding_ids: { output: thisIndicator },
              resolve_written_findings: { output: { ids } },
              forensic_analysis: agentOutput === undefined ? {} : { output: agentOutput },
            },
          })
        );
      const both = [thisIndicator.timeline, thisIndicator.iocs];

      // Both attached, agent skipped this run: the retry case after a full analysis.
      expect(unrecordedWhen(both)).toBe(true);
      // Both attached by this run's agent: the normal case.
      expect(unrecordedWhen(both, { structured_output: { rationale: 'ok' } })).toBe(false);
      // One finding is enough: an earlier run that attached only the IoCs may still have
      // journaled its verdict and raised proposals before its final write failed.
      expect(unrecordedWhen([thisIndicator.timeline])).toBe(true);
      expect(unrecordedWhen([thisIndicator.iocs])).toBe(true);
      // Partial attachments from this run's own analysis are not an earlier run's.
      expect(unrecordedWhen([thisIndicator.iocs], { structured_output: { rationale: 'ok' } })).toBe(
        false
      );
      // Nothing attached: a recorded attempt with no findings is `journal_analysis_problem`'s.
      expect(unrecordedWhen([])).toBe(false);

      const terminal = (outcomeUnrecorded: boolean) => ({
        steps: {
          resolve_request: { output: { has_request: true, investigation_id: 'inv-1' } },
          verify_investigation: { output: { metadata: { id: 'inv-1' } } },
          resolve_run_outcome: {
            output: { settled: true, outcome_unrecorded: outcomeUnrecorded },
          },
          resolve_proposals: { output: { proposals_lost: false } },
        },
      });
      const fires = (name: string, ctx: Record<string, unknown>): unknown =>
        evaluate(String(stepByName(name)?.if), ctx);

      expect(fires('mark_processed', terminal(false))).toBe(true);
      expect(fires('mark_outcome_unrecorded', terminal(false))).toBe(false);
      expect(fires('mark_processed', terminal(true))).toBe(false);
      expect(fires('mark_outcome_unrecorded', terminal(true))).toBe(true);
      // Exactly one verdict on that path: the other failure writes stay quiet.
      expect(fires('mark_failed', terminal(true))).toBe(false);
      expect(fires('mark_proposals_failed', terminal(true))).toBe(false);

      const mark = stepByName('mark_outcome_unrecorded');
      expect(mark?.type).toBe('context-engine.updateKi');
      expect((mark?.with?.ki as { attributes: { status: string } }).attributes.status).toBe(
        'failed'
      );
      expect(
        (mark?.with?.ki as { attributes: { failure_reason: string } }).attributes.failure_reason
      ).toContain('did not record its outcome');

      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('journal_outcome_unrecorded')).toBeLessThan(
        names.indexOf('mark_outcome_unrecorded')
      );
      expect(stepByName('journal_outcome_unrecorded')?.if).toBe(mark?.if);
      expect(stepByName('journal_outcome_unrecorded')?.['on-failure']).toEqual({ continue: true });
    });

    // The case this exists for is a re-dispatch after a failed retirement: the findings
    // are already attached and the only work left is the write. Paying 30m to rediscover
    // them is what made a stuck indicator expensive rather than merely repetitive.
    it('skips the agent when this indicator already has both attachments', () => {
      expect(stepByName('list_prior_findings')?.type).toBe('ai.attachment.list');
      expect(stepByName('forensic_analysis')?.if).toBe(stepByName('mark_attempted')?.if);
      expect(String(stepByName('forensic_analysis')?.if)).toContain(
        'steps.resolve_prior_assessment.output.count != 2'
      );
      expect(String(stepByName('forensic_analysis')?.if)).toContain(
        'steps.resolve_request.output.forensic_attempted_at == blank'
      );

      const thisIndicator = {
        timeline: 'forensic-timeline-ki-1',
        iocs: 'forensic-iocs-ki-1',
      };
      const counted = (ids: string[]): unknown =>
        evaluate(String(stepByName('resolve_prior_assessment')?.with?.count), {
          steps: {
            finding_ids: { output: thisIndicator },
            list_prior_findings: { output: { attachments: ids.map((id) => ({ id })) } },
          },
        });

      expect(counted([thisIndicator.timeline, thisIndicator.iocs])).toBe(2);
      expect(counted([thisIndicator.timeline])).toBe(1);
      expect(counted([thisIndicator.iocs])).toBe(1);
      expect(counted(['forensic-timeline-ki-2', 'forensic-iocs-ki-2'])).toBe(0);
      expect(counted([])).toBe(0);
    });

    // The marker is read from the indicator at the start of the run, not from the
    // write this run is about to make. Otherwise the same execution would record
    // the attempt and then skip the agent it just authorized.
    it('runs the agent at most once per indicator', () => {
      const names = allSteps.map(({ name }) => name);
      const mark = stepByName('mark_attempted');

      expect(names.indexOf('mark_attempted')).toBeLessThan(
        names.indexOf('journal_analysis_started')
      );
      expect(names.indexOf('journal_analysis_started')).toBeLessThan(
        names.indexOf('forensic_analysis')
      );
      expect(mark?.type).toBe('context-engine.updateKi');
      expect(mark?.with).toEqual({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
        ki: {
          attributes: {
            forensic_attempted_at: '{{ execution.startedAt }}',
          },
        },
      });

      const runsAgent = (count: number, attemptedAt: string, present = true): unknown =>
        evaluate(String(stepByName('forensic_analysis')?.if), {
          steps: {
            resolve_prior_assessment: { output: { count } },
            resolve_request: { output: { forensic_attempted_at: attemptedAt } },
            resolve_endpoint_telemetry: { output: { checked: true, present } },
          },
        });

      expect(runsAgent(0, '')).toBe(true);
      expect(runsAgent(1, '')).toBe(true);
      expect(runsAgent(2, '')).toBe(false);
      expect(runsAgent(0, '2026-09-23T14:00:00.000Z')).toBe(false);
      expect(runsAgent(1, '2026-09-23T14:00:00.000Z')).toBe(false);
      expect(runsAgent(0, '', false)).toBe(false);
      // The attempt marker is gated the same way, so a host with nothing to analyze
      // does not use up the indicator's one attempt on a run that never started.
      expect(mark?.if).toBe(stepByName('forensic_analysis')?.if);
    });

    // The forensic skill resolves `logs-endpoint.events.*` only inside the agent, so
    // without a check first a host with no Defend telemetry would spend its one attempt
    // on a 30m run that can only report nothing. The Hunt Watch worker makes the same
    // check (`check_index_scope`) before it selects a report.
    //
    // Anchored on the incident rather than on now, so an old incident is not judged by what
    // the host shipped this week. But it is an existence check whose miss retires the
    // indicator with no retry, so it looks from well before the incident through now, not
    // the agent's ±2h: ingest lag, discoveries built from non-Defend alerts, and long-dwell
    // incidents all have a host that ships telemetry with nothing in those four hours.
    it('checks for Defend telemetry from well before the incident through now, and fails the run rather than guess', () => {
      const names = allSteps.map(({ name }) => name);
      const check = stepByName('check_endpoint_telemetry');

      expect(names.indexOf('resolve_incident_window')).toBeLessThan(
        names.indexOf('check_endpoint_telemetry')
      );
      expect(names.indexOf('check_endpoint_telemetry')).toBeLessThan(
        names.indexOf('mark_attempted')
      );
      expect(names.indexOf('journal_no_telemetry')).toBeLessThan(names.indexOf('mark_attempted'));
      expect(check?.type).toBe('elasticsearch.search');
      expect(check?.with).toEqual({
        index: 'logs-endpoint.events.*',
        ignore_unavailable: true,
        size: 1,
        _source: false,
        query: {
          bool: {
            filter: [
              { term: { 'host.name': '{{ steps.resolve_host.output.host_name }}' } },
              {
                range: {
                  '@timestamp': {
                    gte: '{{ steps.resolve_incident_window.output.start }}||-{{ consts.telemetry_gate_lookback_hours }}h',
                  },
                },
              },
            ],
          },
        },
      });
      // Liquid has no date math, so the lookback is ES date math on the resolved start.
      // No `lte`: telemetry after the incident still says the host ships it.
      const range = (
        check?.with?.query as {
          bool: { filter: Array<{ range?: { '@timestamp': { gte: string; lte?: string } } }> };
        }
      ).bool.filter[1].range?.['@timestamp'];
      expect(range).not.toHaveProperty('lte');
      const rendered = {
        steps: {
          resolve_incident_window: {
            output: { start: '2026-10-16T10:00:00.000Z', end: '2026-10-16T11:30:00.000Z' },
          },
        },
        consts: { telemetry_gate_lookback_hours: 72 },
      };
      expect(liquid.parseAndRenderSync(String(range?.gte), rendered)).toBe(
        '2026-10-16T10:00:00.000Z||-72h'
      );
      // The gate's lookback and the agent's margin are different questions ("does this
      // host ship telemetry?" vs "what happened in the incident?"), so they are separate
      // consts and the gate's is much wider.
      expect(definition.consts?.telemetry_gate_lookback_hours).toBe(72);
      expect(definition.consts?.incident_margin_hours).toBe(2);
      expect(definition.consts?.telemetry_gate_lookback_hours).toBeGreaterThan(
        Number(definition.consts?.incident_margin_hours)
      );
      expect(JSON.stringify(check?.with)).not.toContain('incident_margin_hours');
      const noTelemetry = String(
        (stepByName('journal_no_telemetry')?.with?.inputs as { message?: string } | undefined)
          ?.message
      );
      expect(noTelemetry).toContain('consts.telemetry_gate_lookback_hours');
      expect(noTelemetry).toContain('steps.resolve_incident_window.output.start');
      // The search has no upper bound, so the note names only the start it counts back from.
      expect(noTelemetry).not.toContain('steps.resolve_incident_window.output.end');
      expect(
        liquid.parseAndRenderSync(noTelemetry, {
          ...rendered,
          steps: { ...rendered.steps, resolve_host: { output: { host_name: 'web-01' } } },
        })
      ).toBe(
        'No Elastic Defend telemetry was found for `web-01` in `logs-endpoint.events.*` from 72h before the incident start (`2026-10-16T10:00:00.000Z`) until now, so endpoint analysis was not run.'
      );
      // A read error is a gap, not "no telemetry": the run fails and the indicator stays
      // pending for a cheap retry, like the alert lookups.
      expect(check?.['on-failure']).toBeUndefined();
      // Only looked up on the path where the agent would run, so a retry of a finished
      // analysis does not depend on the telemetry still being there.
      expect(check?.if).toContain('steps.resolve_prior_assessment.output.count != 2');
      expect(check?.if).toContain('steps.resolve_request.output.forensic_attempted_at == blank');

      const resolved = stepByName('resolve_endpoint_telemetry')?.with ?? {};
      const telemetry = (
        field: 'checked' | 'present',
        output?: { hits: { hits: Array<{ _id: string }> } }
      ): unknown =>
        evaluate(String(resolved[field]), {
          steps: { check_endpoint_telemetry: output === undefined ? {} : { output } },
        });
      expect(telemetry('checked', { hits: { hits: [] } })).toBe(true);
      expect(telemetry('present', { hits: { hits: [] } })).toBe(false);
      expect(telemetry('present', { hits: { hits: [{ _id: 'evt-1' }] } })).toBe(true);
      // A skipped check has no output, and that must not read as an empty index.
      expect(telemetry('checked')).toBe(false);
      expect(telemetry('present')).toBe(false);

      const notes = (checked: boolean, present: boolean): unknown =>
        evaluate(String(stepByName('journal_no_telemetry')?.if), {
          steps: { resolve_endpoint_telemetry: { output: { checked, present } } },
        });
      expect(notes(true, false)).toBe(true);
      expect(notes(true, true)).toBe(false);
      expect(notes(false, false)).toBe(false);
    });

    // `ai.attachment.read` cannot answer this question: it catches every error and
    // returns no output, so a missing attachment and a broken attachment service both
    // read as a null version. Deciding "no prior analysis" from that would re-run the
    // agent on the very path this check exists to make cheap, and the containment
    // proposals it dispatches have no fixed id to dedupe on the way attachments do.
    it('tells a missing assessment apart from a failure to look for one', () => {
      // A list either returns a definite set of ids or fails, and failing here leaves
      // the indicator pending rather than guessing — affordable while still upstream
      // of the agent.
      expect(stepByName('list_prior_findings')?.['on-failure']).toBeUndefined();
      expect(allSteps.map(({ name }) => name)).not.toContain('read_prior_assessment');
      expect(stepByName('forensic_analysis')?.if).not.toContain('version == null');
    });

    // Same ambiguity on the way out: three null versions during an outage would read as
    // "this run wrote nothing" and retire a completed analysis as failed. Failing is
    // affordable now that a re-dispatch skips the agent.
    it('decides what it wrote from a list that can fail, not from reads that cannot', () => {
      const list = stepByName('list_written_findings');

      expect(list?.type).toBe('ai.attachment.list');
      expect(list?.['on-failure']).toBeUndefined();
      // The one read is context for the agent. No gate or outcome reads it.
      expect(
        allSteps.filter(({ type }) => type === 'ai.attachment.read').map(({ name }) => name)
      ).toEqual(['read_ad_verdict']);
      const decisions = [
        stepByName('forensic_analysis')?.if,
        stepByName('mark_attempted')?.if,
        ...Object.values(stepByName('resolve_run_outcome')?.with ?? {}),
      ].map(String);
      for (const decision of decisions) {
        expect(decision).not.toContain('read_ad_verdict');
      }
    });

    // The one step whose failure must not fail the run. Without this the run dies at the
    // agent, `mark_failed` never executes, and the indicator stays `pending` — so the
    // sweep starts another 30m agent run a minute later, and keeps doing it for the whole
    // lookback window. A bad connector or a model outage fails every one of them.
    it('retires an indicator whose analysis failed instead of re-running it every minute', () => {
      expect(stepByName('forensic_analysis')?.['on-failure']).toEqual({ continue: true });

      // The journal still branches on the agent's error, which only exists downstream of a
      // step that continued past it. The message itself stays a stable reason plus the
      // execution link: the error body would land in the investigation, where a later
      // agent round reads it as user input.
      const problemMessage = String(
        (stepByName('journal_analysis_problem')?.with?.inputs as { message?: string } | undefined)
          ?.message
      );
      expect(problemMessage).toContain('steps.forensic_analysis.error');
      expect(problemMessage).not.toContain('error.message');
      // Linked rather than a bare id, so the analyst can open the run.
      expect(problemMessage).toContain('[See execution]({{ execution.url }})');
      expect(stepByName('journal_rationale')?.if).toContain(
        'steps.forensic_analysis.error == null'
      );
    });

    // Nothing reached the investigation, so all it has is the handoff. It has to be told,
    // and told before the retirement, which is now allowed to fail the run.
    it('tells the investigation when the analysis reached it with nothing', () => {
      const journal = stepByName('journal_analysis_problem');
      const names = allSteps.map(({ name }) => name);

      expect(journal?.if).toBe(stepByName('mark_failed')?.if);
      expect(journal?.['on-failure']).toEqual({ continue: true });
      expect(names.indexOf('journal_analysis_problem')).toBeLessThan(names.indexOf('mark_failed'));

      // Each case renders one sentence about what happened, and never the error body.
      const message = String((journal?.with?.inputs as { message?: string } | undefined)?.message);
      const render = (agentError: string | null, attemptedAt: string): string =>
        liquid.parseAndRenderSync(message, {
          execution: { id: 'exec-1', url: 'https://kibana/exec-1' },
          steps: {
            resolve_host: { output: { host_name: 'host-a' } },
            resolve_request: { output: { forensic_attempted_at: attemptedAt } },
            forensic_analysis: agentError === null ? {} : { error: { message: agentError } },
          },
        });

      expect(render('boom', '')).toContain('left no findings');
      expect(render('boom', '')).toContain('The forensic agent failed.');
      expect(render('boom', '')).not.toContain('boom');
      expect(render(null, '2026-09-23T14:00:00.000Z')).toContain(
        'A previous attempt did not finish'
      );
      expect(render(null, '')).toContain('The analysis did not finish.');
      expect(render(null, '')).toContain('exec-1');
      expect(render(null, '')).toContain('https://kibana/exec-1');
    });
  });

  // The handoff KI carries ids only; this run dereferences them. Told just the host, the
  // agent searched back from now and could rest a containment recommendation on an older,
  // unrelated incident on the same host (security-team#20243). So it is told which attack
  // it is investigating, what AD concluded, and the window the incident spans.
  describe('what the agent is told about the incident', () => {
    const message = String(stepByName('forensic_analysis')?.with?.message);
    const context = stepByName('resolve_incident_context')?.with ?? {};
    const adAlert = {
      _id: 'ad-1',
      _source: {
        '@timestamp': '2026-10-16T12:00:00.000Z',
        'kibana.alert.attack_discovery.alert_ids': ['a-1', 'a-2', 'a-3'],
        'kibana.alert.attack_discovery.title_with_replacements':
          'IMDS Credential Harvest with Post-Compromise Recon',
        'kibana.alert.attack_discovery.summary_markdown_with_replacements':
          'curl reached the IMDS endpoint on azep-bd79f31511',
        'kibana.alert.attack_discovery.details_markdown_with_replacements': 'Step by step.',
      },
    };

    it('reads the discovery narrative off the alert, with real names, not the host alone', () => {
      const source = stepByName('fetch_attack_discovery_alert')?.with?._source as string[];
      expect(source).toEqual(
        expect.arrayContaining([
          '@timestamp',
          'host.name',
          'kibana.alert.attack_discovery.alert_ids',
          'kibana.alert.attack_discovery.title_with_replacements',
          'kibana.alert.attack_discovery.summary_markdown_with_replacements',
          'kibana.alert.attack_discovery.details_markdown_with_replacements',
        ])
      );
      expect(source).not.toContain('kibana.alert.attack_discovery.title');
      expect(source).not.toContain('kibana.alert.attack_discovery.summary_markdown');
    });

    it('spans the incident from the earliest to the latest cited alert', () => {
      const aggregations = stepByName('extract_host_from_ad_constituent_alerts')?.with
        ?.aggregations as Record<string, unknown>;
      expect(aggregations.incident_start).toEqual({ min: { field: 'kibana.alert.original_time' } });
      expect(aggregations.incident_end).toEqual({ max: { field: 'kibana.alert.original_time' } });

      const window = stepByName('resolve_incident_window')?.with ?? {};
      const resolve = (field: string, aggs?: Record<string, { value_as_string?: string }>) =>
        evaluate(String(window[field]), {
          steps: {
            fetch_attack_discovery_alert: { output: { hits: { hits: [adAlert] } } },
            extract_host_from_ad_constituent_alerts:
              aggs === undefined ? {} : { output: { aggregations: aggs } },
          },
        });
      const fromAlerts = {
        incident_start: { value_as_string: '2026-10-16T10:00:00.000Z' },
        incident_end: { value_as_string: '2026-10-16T11:30:00.000Z' },
      };
      expect(resolve('start', fromAlerts)).toBe('2026-10-16T10:00:00.000Z');
      expect(resolve('end', fromAlerts)).toBe('2026-10-16T11:30:00.000Z');
      expect(resolve('from_alerts', fromAlerts)).toBe(true);
    });

    // A discovery whose alerts carry no `original_time`, or that cites none, still has
    // its own time. A window always exists once the alert was found, so nothing
    // downstream has to carry a "no window" branch.
    it('falls back to the discovery time when the cited alerts give no span', () => {
      const window = stepByName('resolve_incident_window')?.with ?? {};
      const resolve = (field: string, aggs?: Record<string, { value_as_string?: string }>) =>
        evaluate(String(window[field]), {
          steps: {
            fetch_attack_discovery_alert: { output: { hits: { hits: [adAlert] } } },
            extract_host_from_ad_constituent_alerts:
              aggs === undefined ? {} : { output: { aggregations: aggs } },
          },
        });
      expect(resolve('start')).toBe('2026-10-16T12:00:00.000Z');
      expect(resolve('end')).toBe('2026-10-16T12:00:00.000Z');
      expect(resolve('from_alerts')).toBe(false);
      const empty = { incident_start: { value_as_string: undefined }, incident_end: {} };
      expect(resolve('start', empty)).toBe('2026-10-16T12:00:00.000Z');
      expect(resolve('from_alerts', empty)).toBe(false);
    });

    // The review writes its verdict to a fixed attachment id. The KI's `classification`
    // is the fallback when that read returns nothing, and the read is gated with the
    // agent so a retry that skips the agent does not pay for it.
    it('reads the AD verdict as context and falls back to the handoff classification', () => {
      const read = stepByName('read_ad_verdict');
      expect(read?.type).toBe('ai.attachment.read');
      expect(read?.with).toEqual({
        conversation_id: '{{ steps.resolve_request.output.investigation_id }}',
        attachment_id: 'analysis-verdict',
      });
      expect(read?.['on-failure']).toEqual({ continue: true });
      expect(read?.if).toBe(stepByName('forensic_analysis')?.if);

      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('read_ad_verdict')).toBeLessThan(
        names.indexOf('resolve_incident_context')
      );
      expect(names.indexOf('resolve_incident_context')).toBeLessThan(
        names.indexOf('forensic_analysis')
      );

      const verdict = (read_ad_verdict: Record<string, unknown>) =>
        liquid.parseAndRenderSync(String(context.verdict), {
          steps: {
            read_ad_verdict,
            resolve_request: { output: { classification: 'true_positive' } },
          },
        });
      expect(verdict({ output: { data: { verdict: 'inconclusive' } } })).toBe('inconclusive');
      expect(verdict({})).toBe('true_positive');
      expect(String(stepByName('resolve_request')?.with?.classification)).toContain(
        'attributes.classification'
      );
    });

    it('names the attack, the verdict, the window and the margin in the message', () => {
      for (const reference of [
        'steps.resolve_request.output.attack_discovery_alert_id',
        'steps.resolve_incident_context.output.title',
        'steps.resolve_incident_context.output.summary',
        'steps.resolve_incident_context.output.details',
        'steps.resolve_incident_context.output.verdict',
        'steps.resolve_incident_context.output.verdict_summary',
        'steps.resolve_incident_context.output.verdict_rationale',
        'steps.resolve_incident_window.output.start',
        'steps.resolve_incident_window.output.end',
        'consts.incident_margin_hours',
      ]) {
        expect(message).toContain(reference);
      }
      expect(message).not.toContain('I have an alert on');

      const rendered = liquid.parseAndRenderSync(message, {
        steps: {
          resolve_host: { output: { host_name: 'azep-bd79f31511' } },
          resolve_request: { output: { attack_discovery_alert_id: 'ad-1' } },
          resolve_incident_context: {
            output: {
              title: 'IMDS Credential Harvest',
              summary: 'curl reached the IMDS endpoint',
              details: 'Step by step.',
              verdict: 'true_positive',
              verdict_summary: 'The chain holds.',
              verdict_rationale: '',
            },
          },
          resolve_incident_window: {
            output: {
              start: '2026-10-16T10:00:00.000Z',
              end: '2026-10-16T11:30:00.000Z',
              from_alerts: true,
            },
          },
        },
        consts: { incident_margin_hours: 2 },
      });
      expect(rendered).toContain('Attack Discovery `ad-1`');
      expect(rendered).toContain('IMDS Credential Harvest');
      expect(rendered).toContain('Attack Discovery verdict: true_positive. The chain holds.');
      expect(rendered).not.toContain('Verdict rationale');
      expect(rendered).toContain(
        'Incident window: `2026-10-16T10:00:00.000Z` to `2026-10-16T11:30:00.000Z`, the earliest to the latest cited alert'
      );
      expect(rendered).toContain('Margin: 2 hours on each side.');
    });

    // The cited alerts are not listed: the agent has no tool that resolves an id and never queried
    // one. They stay on the Attack Discovery alert, and `extract_host_from_ad_constituent_alerts`
    // reads them to resolve the host and window the message does carry.
    it('does not list the cited alerts or their count in the message', () => {
      expect(context).not.toHaveProperty('alert_ids');
      expect(context).not.toHaveProperty('alert_count');
      expect(message).not.toContain('Cited alerts');
      expect(message).not.toContain('alert_ids');
      expect(definition.consts).not.toHaveProperty('max_cited_alert_ids_in_prompt');
    });

    // The agent must not do date arithmetic. The tools apply the margin and return the
    // exact range, and that range is what the timeline attachment shows.
    it('tells the agent to anchor its tools on the window and copy the searched range back', () => {
      expect(message).toContain("Call the skill's tools with `start`, `end`, and `margin_hours`");
      expect(message).toContain('Do not use `time_window_hours`');
      expect(message).toContain('Do not do date arithmetic yourself');
      // `searched_window` also carries `anchor`, which `timeline.window` does not declare,
      // so the instruction names the two fields rather than the object.
      expect(message).toContain('Copy its `start` and `end` into `timeline.window`');

      const schema = stepByName('forensic_analysis')?.with?.schema as {
        properties: {
          timeline: {
            required: string[];
            properties: { window: { required: string[]; properties: Record<string, unknown> } };
          };
        };
      };
      expect(schema.properties.timeline.required).toEqual(['events', 'window']);
      expect(schema.properties.timeline.properties.window.required).toEqual(['start', 'end']);
      expect(schema.properties.timeline.properties.window.properties.start).toMatchObject({
        type: 'string',
        minLength: 1,
        maxLength: 64,
      });
      // Passed through untouched, so the attachment carries the window the agent searched.
      expect(stepByName('attach_timeline')?.with?.data).toBe(
        '${{ steps.forensic_analysis.output.structured_output.timeline }}'
      );
      expect(String(stepByName('attach_timeline')?.with?.description)).toContain(
        'structured_output.timeline.window.start'
      );
    });

    it('keeps older activity apart from the incident and out of containment on its own', () => {
      expect(message).toContain('Evidence inside the window is this incident');
      expect(message).toContain('Evidence outside the window with no tie is history');
      expect(message).toContain('`## Earlier activity`');
      expect(message).toContain('History alone does not make this a real incident');
      expect(message).toContain(
        'Containment based on history needs a concrete tie to this incident'
      );
      expect(message).toContain("Name the tie in that action's");
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        properties: { rationale: { description: string } };
      };
      expect(schema.properties.rationale.description).toContain('`## Earlier activity`');
    });

    // Initial access routinely precedes the first alert by hours or days. A narrow
    // window must not push patient zero into "earlier activity": reaching it through a
    // tie from inside the window makes it part of this incident, and it goes in the
    // timeline with its real timestamp.
    it('lets the agent follow initial access back past the window and keep it in the timeline', () => {
      const flat = message.replace(/\s+/g, ' ');
      expect(flat).toContain('or the initial access that led to it');
      expect(flat).toContain('Evidence you reached by following such a tie is');
      expect(flat).toContain('put it in `timeline.events` with');
      expect(flat).toContain('Patient zero is often before the window');
      expect(flat).toContain('Tied findings belong in');
    });
  });

  // Each action publishes its own input contract as `inputSchema` on its catalog
  // entry, which the model only sees once it has called the catalog — after this
  // schema is fixed. So the contract cannot live here, and a copy of it would pin
  // today's Defend actions onto every future one while drifting from bounds this
  // cannot express. `assertActionInputValid` rejects a bad input at proposal time.
  // Once the analysis has run, the attack and its detection alerts have been looked
  // at and the Investigation waits for the analyst's decisions, ending with whether
  // to close it. They are acknowledged and tagged meanwhile; closing is that
  // decision's, so nothing here is closed.
  describe('acknowledges the attack and its alerts after the analysis', () => {
    const resolve = stepByName('resolve_attack_alerts')?.with as Record<string, string>;
    const attackStep = stepByName('acknowledge_attack');
    const tagStep = stepByName('tag_attack_alerts');
    const ackStep = stepByName('acknowledge_attack_alerts');
    const verifyStep = stepByName('verify_attack_alerts');
    const retired = stepByName('resolve_attack_alerts_retired')?.with as Record<string, string>;
    const note = stepByName('journal_attack_alerts');

    const attackHit = (status: string, alertIds?: string[]) => ({
      _id: 'ad-1',
      _source: {
        'kibana.alert.workflow_status': status,
        ...(alertIds === undefined ? {} : { 'kibana.alert.attack_discovery.alert_ids': alertIds }),
      },
    });
    const when = (overrides: {
      analyzed?: boolean;
      status?: string;
      currentStatus?: string;
      alertIds?: string[];
    }) =>
      withAgentResult({
        steps: {
          forensic_analysis:
            overrides.analyzed === false ? {} : { output: { structured_output: {} } },
          fetch_attack_discovery_alert: {
            output: { hits: { hits: [attackHit(overrides.status ?? 'open', overrides.alertIds)] } },
          },
          // Read after the analysis, so it wins over the fetch before the agent ran.
          reread_attack_status: {
            output: {
              hits: { hits: [attackHit(overrides.currentStatus ?? overrides.status ?? 'open')] },
            },
          },
        },
      });

    it('reads the attack status it needs together with the alert ids', () => {
      const source = stepByName('fetch_attack_discovery_alert')?.with?._source as string[];
      expect(source).toContain('kibana.alert.workflow_status');
      expect(source).toContain('kibana.alert.attack_discovery.alert_ids');
    });

    it('acts only when the agent ran in this execution', () => {
      expect(evaluate(resolve.analyzed, when({}))).toBe(true);
      expect(evaluate(resolve.analyzed, when({ analyzed: false }))).toBe(false);
      // A failed agent leaves partial output next to its error; nothing is acted on.
      expect(
        evaluate(
          resolve.analyzed,
          withAgentResult({
            steps: {
              forensic_analysis: {
                error: { message: 'boom' },
                output: { message: '', metadata: { usage: {} } },
              },
            },
          })
        )
      ).toBe(false);
      for (const step of [attackStep, tagStep, ackStep, verifyStep, note]) {
        expect(String(step?.if)).toContain('steps.resolve_attack_alerts.output.analyzed == true');
      }
    });

    // An analyst can close the attack while the agent runs; the fetch before it is stale.
    it('decides on the status read after the analysis, not the one fetched before it', () => {
      const reread = stepByName('reread_attack_status');
      expect(reread?.type).toBe('elasticsearch.search');
      expect(String(reread?.if)).toContain('steps.resolve_agent_result.output.completed == true');
      expect(reread?.['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '5s' },
        continue: true,
      });
      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('reread_attack_status')).toBeGreaterThan(
        names.indexOf('forensic_analysis')
      );
      expect(names.indexOf('reread_attack_status')).toBeLessThan(
        names.indexOf('resolve_attack_alerts')
      );

      expect(
        evaluate(resolve.attack_status, when({ status: 'open', currentStatus: 'closed' }))
      ).toBe('closed');
      expect(evaluate(resolve.attack_status, when({ status: 'open' }))).toBe('open');
    });

    // Acknowledging a closed attack would reopen it and drop its reason.
    it('acknowledges the attack only while it is open, and leaves its alerts to the by-query write', () => {
      expect(attackStep?.type).toBe('security.setAttackStatus');
      expect(attackStep?.with).toEqual({
        ids: ['{{ steps.resolve_attack_alerts.output.attack_id }}'],
        status: 'acknowledged',
        update_related_alerts: false,
      });
      expect(attackStep?.['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '5s' },
        continue: true,
      });

      const fires = (analyzed: boolean, status: string) =>
        evaluate(String(attackStep?.if), {
          steps: { resolve_attack_alerts: { output: { analyzed, attack_status: status } } },
        });
      expect(fires(true, 'open')).toBe(true);
      expect(fires(true, 'acknowledged')).toBe(false);
      expect(fires(true, 'closed')).toBe(false);
      expect(fires(false, 'open')).toBe(false);
    });

    // Same shape as the Attack Discovery review's retirement of correlated alerts:
    // tagged first, acknowledged by query so only open alerts are touched, read back.
    it('tags every alert and acknowledges only the open ones, by query', () => {
      expect(tagStep?.type).toBe('security.setAlertTags');
      expect(tagStep?.with).toEqual({
        alert_ids: '${{ steps.resolve_attack_alerts.output.alert_ids }}',
        tags_to_add: ['{{ consts.endpoint_analyzed_tag }}'],
      });
      expect(definition.consts?.endpoint_analyzed_tag).toBe('az:endpoint_analyzed');

      expect(ackStep?.type).toBe('kibana.SetAlertsStatus');
      expect(ackStep?.with).toEqual({
        status: 'acknowledged',
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [
              { ids: { values: '${{ steps.resolve_attack_alerts.output.alert_ids }}' } },
              { term: { 'kibana.alert.workflow_status': 'open' } },
            ],
          },
        },
      });
      for (const step of [tagStep, ackStep, verifyStep]) {
        expect(step?.['on-failure']).toEqual({
          retry: { 'max-attempts': 3, delay: '5s' },
          continue: true,
        });
        expect(String(step?.if)).toContain('steps.resolve_attack_alerts.output.has_alerts == true');
      }
      expect(evaluate(resolve.has_alerts, when({ alertIds: ['a-1'] }))).toBe(true);
      expect(evaluate(resolve.has_alerts, when({ alertIds: [] }))).toBe(false);
      expect(evaluate(resolve.has_alerts, when({}))).toBe(false);
    });

    it('closes nothing', () => {
      const names = allSteps.map(({ name }) => name);
      const closers = allSteps.filter(
        ({ type, with: withInputs }) =>
          (type === 'security.setAttackStatus' || type === 'kibana.SetAlertsStatus') &&
          withInputs?.status === 'closed'
      );
      expect(closers).toEqual([]);
      expect(JSON.stringify(definition)).not.toContain('ai.conversation.metadata.patch');
      expect(names.indexOf('resolve_attack_alerts')).toBeGreaterThan(
        names.indexOf('journal_rationale')
      );
    });

    it('reports what was read back, never a write error', () => {
      const message = String((note?.with as { inputs?: { message?: string } })?.inputs?.message);
      expect(message).not.toContain('error');
      const render = (
        counts: Partial<Record<string, number | boolean>>,
        status = 'open',
        hasAlerts = true
      ) =>
        liquid.parseAndRenderSync(message, {
          consts: { endpoint_analyzed_tag: 'az:endpoint_analyzed' },
          execution: { id: 'exec-1', url: 'https://kibana/exec-1' },
          steps: {
            resolve_attack_alerts: { output: { attack_status: status, has_alerts: hasAlerts } },
            resolve_attack_alerts_retired: {
              output: {
                read: true,
                requested: 3,
                tagged: 3,
                open: 0,
                acknowledged: 2,
                closed: 1,
                attack_acknowledged: true,
                ...counts,
              },
            },
          },
        });

      expect(render({})).toBe(
        'Acknowledged the attack while this Investigation waits for a decision. Tagged 3 of its 3 detection alert(s) `az:endpoint_analyzed`. Acknowledged: 2; already closed and left as they were: 1.'
      );
      expect(render({ tagged: 2, open: 1, acknowledged: 1 })).toBe(
        'Acknowledged the attack while this Investigation waits for a decision. Tagged 2 of its 3 detection alert(s) `az:endpoint_analyzed`. Acknowledged: 1; already closed and left as they were: 1; still open, because acknowledging them did not land: 1. [See execution](https://kibana/exec-1).'
      );
      expect(render({ attack_acknowledged: false }, 'acknowledged')).toContain(
        'The attack was already `acknowledged` and was left as it was.'
      );
      expect(render({ attack_acknowledged: false }, 'open')).toContain(
        'The attack could not be acknowledged and is still open. [See execution](https://kibana/exec-1).'
      );
      // A failed re-read leaves the status blank: the attack may well be open, so it is not called "already" anything.
      expect(render({ attack_acknowledged: false }, '')).toContain(
        "Could not read the attack's status after the analysis, so it was left as it was. [See execution](https://kibana/exec-1)."
      );
      expect(render({ read: false })).toContain('Could not read its 3 detection alert(s) back');
      expect(render({}, 'open', false)).toBe(
        'Acknowledged the attack while this Investigation waits for a decision. It lists no detection alerts.'
      );
      expect(retired.attack_acknowledged).toBe(
        '${{ steps.acknowledge_attack.output.success == true }}'
      );
    });
  });

  describe('containment proposals', () => {
    const schema = stepByName('forensic_analysis')?.with?.schema as {
      required?: string[];
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

    // Without this, `propose: true` and no list at all is valid output. The dispatch
    // step runs only when that list has items, so a missing list attaches the findings
    // and retires the indicator as processed — the containment the analysis just spent
    // 30m justifying disappears with no failure anywhere to show for it.
    it('makes the model state that it proposes nothing rather than stay silent', () => {
      expect(schema?.required).toContain('recommendedActions');
      expect(String(stepByName('forensic_analysis')?.with?.message)).toContain(
        'empty `recommendedActions` list'
      );
    });

    it('leaves the action input shape to the catalog instead of restating it', () => {
      const actionInput = recommendation?.properties?.actionInput;
      expect(actionInput?.type).toBe('object');
      expect(actionInput?.additionalProperties).toBe(true);
      // A restated shape is exactly what must not come back: `required: [endpoint_ids]`
      // would make an action that takes none impossible to propose.
      expect(actionInput?.properties).toBeUndefined();
      expect(actionInput?.required).toBeUndefined();
    });

    // Every field here is read when the proposal is dispatched, so a field the workflow
    // never passes on is one the model spends tokens filling for nothing. The field names
    // are the ones `alertzero.resolveProposals` takes, so the list is handed over as is.
    it('asks only for the fields the proposal dispatch passes on', () => {
      expect(Object.keys(recommendation?.properties ?? {}).sort()).toEqual([
        'actionInput',
        'actionWorkflowId',
        'comment',
        'confidence',
        'title',
      ]);
      expect(recommendation?.required).toEqual([
        'actionWorkflowId',
        'actionInput',
        'title',
        'comment',
        'confidence',
      ]);
      // 256 is the proposal step's title limit. The dispatch truncates to the same bound.
      expect(recommendation?.properties?.title).toMatchObject({
        type: 'string',
        minLength: 1,
        maxLength: 256,
      });
      // A blank id is schema-valid without this, and the proposal workflow treats a
      // blank actionWorkflowId as a no-action card an analyst can approve.
      expect(recommendation?.properties?.actionWorkflowId).toMatchObject({
        type: 'string',
        minLength: 1,
        maxLength: 256,
      });
    });

    // Confidence is per recommendation, not per run: one reconstruction can be certain
    // about the host it watched encrypt and only suspect a second one, and each entry
    // becomes its own card in the approval queue.
    it('asks for confidence per action, on the scale the proposal queue accepts', () => {
      expect(recommendation?.properties?.confidence?.enum).toEqual(['low', 'medium', 'high']);

      const message = stepByName('forensic_analysis')?.with?.message as string;
      expect(message).toContain('`confidence` per action');
    });

    // `impact` and `category` would override what the action declares, and for containment
    // both are intrinsic to the action rather than to this run. Confidence is the inverse:
    // nothing but the agent that weighed the evidence can supply it, so leaving it unset is
    // the one gap the caller has to fill.
    it('supplies confidence to the proposal and leaves impact to the action', () => {
      const proposeAction = stepByName('propose_action')?.with as {
        'workflow-id'?: string;
        inputs?: Record<string, unknown>;
      };
      const inputs = proposeAction?.inputs;

      // The forensics gate wraps the bridge, so `origin` is still stamped there and
      // containment proposals land in the queue AlertZero actually reads.
      expect(proposeAction?.['workflow-id']).toBe(ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID);
      expect(inputs?.confidence).toBe("{{ foreach.item.confidence | default: '' }}");
      // A missing title stores the action's own name, so two isolates of different
      // hosts share one queue label. The prompt tells the model to name the target.
      expect(inputs?.title).toBe('{{ foreach.item.title | truncate: 256, "" }}');
      expect(
        evaluate(String(inputs?.title), {
          foreach: { item: { title: 'Isolate host WIN-ANALYST01' } },
        })
      ).toBe('Isolate host WIN-ANALYST01');
      expect(String(stepByName('forensic_analysis')?.with?.message)).toContain('`title`');
      expect(inputs?.impact).toBeUndefined();
      expect(inputs?.category).toBeUndefined();
    });

    // The comment is the body of the approval card. `rationale` is the whole assessment,
    // up to 7900 characters, and is journaled once on the investigation; a card that
    // repeats it on every action is too long to review. So each recommendation carries
    // its own short comment, required by the schema, and the dispatch never reaches for
    // the rationale.
    it('puts a short per-action comment on each card instead of the full rationale', () => {
      const comment = recommendation?.properties?.comment as {
        type?: string;
        minLength?: number;
        maxLength?: number;
      };
      expect(comment).toMatchObject({ type: 'string', minLength: 1, maxLength: 500 });

      const message = String(stepByName('forensic_analysis')?.with?.message);
      expect(message).toContain('Set `comment` on every recommendation');
      expect(message).toContain('Do not restate the assessment from `rationale`');

      const inputs = (stepByName('propose_action')?.with as { inputs?: Record<string, string> })
        ?.inputs;
      expect(inputs?.comment).not.toContain('rationale');
      expect(
        liquid.parseAndRenderSync(String(inputs?.comment), {
          foreach: {
            item: { title: 'Kill powershell.exe (PID 4212)', comment: 'Encrypting C:\\Users.' },
          },
        })
      ).toBe('Encrypting C:\\Users.');
      // A blank comment would be rejected by the bridge, which requires one. The label
      // keeps the card readable rather than failing the dispatch.
      expect(
        liquid.parseAndRenderSync(String(inputs?.comment), {
          foreach: { item: { title: 'Kill powershell.exe (PID 4212)', comment: '' } },
        })
      ).toBe('Kill powershell.exe (PID 4212)');
    });

    // One gate — the containment proposals — so the dial is the same two levels as
    // Attack Discovery. The level is the indicator attribute the worker wrote.
    // A missing attribute fails closed to manual. The trigger does not accept a level.
    it('auto-approves containment only at supervised autonomy', () => {
      expect(definition.triggers?.[0]?.inputs?.properties?.autonomy).toBeUndefined();
      expect(definition.consts?.default_autonomy).toBe('manual');

      const level = String(stepByName('resolve_autonomy')?.with?.level);
      const recorded = (autonomy?: string) => ({
        steps: {
          read_ki: {
            output: {
              hits: {
                hits: [{ _source: { attributes: autonomy === undefined ? {} : { autonomy } } }],
              },
            },
          },
        },
        consts: { default_autonomy: 'manual' },
      });
      expect(evaluate(level, recorded())).toBe('manual');
      expect(evaluate(level, recorded('supervised'))).toBe('supervised');
      expect(evaluate(level, recorded('manual'))).toBe('manual');

      const autoApprove = String(
        (
          stepByName('propose_action')?.with as {
            inputs?: Record<string, unknown>;
          }
        )?.inputs?.autoApprove
      );
      const when = (autonomy: string) => ({
        steps: { resolve_autonomy: { output: { level: autonomy } } },
      });
      expect(evaluate(autoApprove, when('supervised'))).toBe(true);
      expect(evaluate(autoApprove, when('manual'))).toBe(false);
    });

    // Containment rests on this run's agent output, not on the attachments: a rejected
    // timeline is journaled, and the recommendations still reach the queue. `settled` is
    // also true when there was no host, which must not propose anything.
    it('dispatches containment only after this run finished its analysis', () => {
      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('resolve_run_outcome')).toBeLessThan(
        names.indexOf('resolve_proposal_slots')
      );
      expect(names.indexOf('resolve_proposal_slots')).toBeLessThan(
        names.indexOf('resolve_proposal_counts')
      );
      expect(names.indexOf('resolve_proposal_counts')).toBeLessThan(
        names.indexOf('journal_proposals_queued')
      );
      expect(names.indexOf('journal_proposals_queued')).toBeLessThan(
        names.indexOf('propose_actions')
      );
      expect(names.indexOf('propose_actions')).toBeLessThan(names.indexOf('resolve_proposals'));
      expect(names.indexOf('resolve_proposals')).toBeLessThan(names.indexOf('mark_processed'));

      // The slot resolution carries the gate; the dispatch keys off what it returned.
      const gate = String(stepByName('resolve_proposal_slots')?.if);
      expect(gate).toContain('steps.resolve_run_outcome.output.analyzed == true');
      expect(gate).not.toContain('steps.resolve_run_outcome.output.attached');
      expect(gate).toContain('recommendedActions.size > 0');
      expect(gate).not.toContain('settled');
      expect(stepByName('propose_actions')?.if).toBe(
        '${{ steps.resolve_proposal_counts.output.new_count > 0 }}'
      );
      // `| default: []` is not an array in this engine, so `foreach` hard-fails on it.
      expect(stepByName('propose_actions')?.foreach).toBe(
        '${{ steps.resolve_proposal_slots.output.proposals }}'
      );

      const when = (analyzed: boolean, propose: boolean, recommended = 1) => ({
        steps: {
          resolve_run_outcome: { output: { analyzed, attached: false } },
          forensic_analysis: {
            output: {
              structured_output: {
                propose,
                recommendedActions: Array.from({ length: recommended }, () => ({})),
              },
            },
          },
        },
      });
      expect(evaluate(gate, when(true, true))).toBe(true);
      expect(evaluate(gate, when(true, true, 0))).toBe(false);
      expect(evaluate(gate, when(false, true))).toBe(false);
      expect(evaluate(gate, when(true, false))).toBe(false);
    });

    // The investigation used to stay open after the last containment decision, and
    // then briefly closed itself with no reason. The gate now asks the analyst once
    // every proposal on the investigation is settled, so each dispatch goes through
    // the gate (still async: this run must not park on the approval window) and
    // tells it which investigation and attack the question is about, how many
    // proposals to wait for, and what an approved close records.
    describe('asks whether to close the investigation once every proposal is decided', () => {
      const gate = parse(ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.yaml) as {
        triggers?: Array<{
          inputs?: {
            required?: string[];
            properties?: Record<string, unknown>;
            additionalProperties?: boolean;
          };
        }>;
      };
      const dispatch = stepByName('propose_action');
      const inputs = (dispatch?.with as { inputs?: Record<string, unknown> })?.inputs ?? {};

      it('dispatches the gate asynchronously by its registered id', () => {
        expect(dispatch?.type).toBe('workflow.executeAsync');
        expect((dispatch?.with as { 'workflow-id'?: string })?.['workflow-id']).toBe(
          ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.id
        );
      });

      // The gate's own declared trigger schema is what the dispatch is checked against,
      // not a copy of it, so a change to either side fails here rather than at runtime.
      it('satisfies the gate trigger schema', () => {
        const gateInputs = gate.triggers?.[0]?.inputs;
        const provided = Object.keys(inputs);
        const declared = Object.keys(gateInputs?.properties ?? {});

        expect((gateInputs?.required ?? []).filter((key) => !provided.includes(key))).toEqual([]);
        expect(gateInputs?.additionalProperties).toBe(false);
        expect(provided.filter((key) => !declared.includes(key))).toEqual([]);
      });

      it('asks about the investigation it proposed on, and the attack it was opened for', () => {
        expect(inputs.investigationConversationId).toBe(inputs.conversationId);
        expect(inputs.attackDiscoveryId).toBe(
          '{{ steps.fetch_attack_discovery_alert.output.hits.hits[0]._id }}'
        );
        expect(inputs.closureSummary).toBeUndefined();
      });

      // The barrier counts every proposal on the investigation, and this one already
      // holds at least the approved handoff that requested the analysis. The step
      // computes that total: the ones already there plus the ones about to be created.
      it('baselines the creation barrier on the proposals already there', () => {
        expect(inputs.expectedProposalCount).toBe(
          '${{ steps.resolve_proposal_slots.output.expectedProposalCount }}'
        );
      });

      it('hands the gate the id the slot was resolved under', () => {
        expect(inputs.proposalId).toBe('{{ foreach.item.proposalId }}');
        expect(inputs.actionWorkflowId).toBe('{{ foreach.item.actionWorkflowId }}');
      });

      it('hands the gate what an approved close records, from the verdict', () => {
        expect(inputs.closeReason).toBe('{{ steps.resolve_verdict.output.close_reason }}');
        expect(inputs.attackReason).toBe('{{ steps.resolve_verdict.output.attack_reason }}');
        expect(inputs.assessment).toBe('{{ steps.resolve_verdict.output.assessment }}');
        expect(inputs.attackAlertCount).toBe(
          '${{ steps.resolve_verdict.output.attack_alert_count }}'
        );
      });

      it('tells the analyst they will be asked, not that the investigation will close itself', () => {
        const message = String(
          (stepByName('journal_proposals_queued')?.with as { inputs?: { message?: string } })
            ?.inputs?.message
        );
        expect(message).toContain('you are asked whether to close the investigation');
        expect(message).not.toContain('closes once every proposal');
        expect(message).not.toContain('stays open until an analyst closes it');
      });
    });

    // The agent's verdict is the one structured call the run acts on: it decides what
    // an approved close records, and `not_an_incident` keeps every containment card
    // off the Investigation. The `resolved` / `true_positive` / `other` defaults for
    // the other two verdicts are a Product decision still open.
    describe('the verdict', () => {
      const analysisSchema = stepByName('forensic_analysis')?.with?.schema as {
        required?: string[];
        properties?: { verdict?: { type?: string; enum?: string[] } };
      };
      const verdictStep = stepByName('resolve_verdict')?.with as Record<string, string>;
      const analysis = (verdict: string | undefined, extra: Record<string, unknown> = {}) =>
        withAgentResult({
          steps: {
            forensic_analysis: { output: { structured_output: { verdict, ...extra } } },
            ...extra,
          },
        });
      const render = (key: string, verdict: string | undefined, rationale?: string) =>
        liquid.parseAndRenderSync(verdictStep[key], analysis(verdict, { rationale }));

      it('is required of the agent, with exactly three values', () => {
        expect(analysisSchema.required).toContain('verdict');
        expect(analysisSchema.properties?.verdict).toMatchObject({
          type: 'string',
          enum: ['confirmed_incident', 'not_an_incident', 'unclear'],
        });
        const prompt = String(
          (stepByName('forensic_analysis')?.with as { message?: string })?.message
        );
        expect(prompt).toContain('Set `verdict` first');
        expect(prompt).toContain('`not_an_incident` only when');
        expect(prompt).toContain('Older activity outside the incident window is history');
      });

      it('maps each verdict to what an approved close records, and a missing one to other', () => {
        expect(render('close_reason', 'not_an_incident')).toBe('false_positive');
        expect(render('attack_reason', 'not_an_incident')).toBe('false_positive');
        expect(render('close_reason', 'confirmed_incident')).toBe('resolved');
        expect(render('attack_reason', 'confirmed_incident')).toBe('true_positive');
        expect(render('close_reason', 'unclear')).toBe('other');
        expect(render('attack_reason', 'unclear')).toBe('other');
        expect(render('close_reason', undefined)).toBe('other');
        expect(render('attack_reason', undefined)).toBe('other');

        expect(evaluate(verdictStep.not_an_incident, analysis('not_an_incident'))).toBe(true);
        expect(evaluate(verdictStep.not_an_incident, analysis('confirmed_incident'))).toBe(false);
        expect(evaluate(verdictStep.not_an_incident, { steps: {} })).toBe(false);
      });

      // The indicator records the verdict only from a run in which the agent ran.
      it('records the verdict only from an analysis that ran, defaulting a missing one to unclear', () => {
        expect(render('value', 'not_an_incident')).toBe('not_an_incident');
        expect(render('value', undefined)).toBe('unclear');
        expect(liquid.parseAndRenderSync(verdictStep.value, { steps: {} })).toBe('');
      });

      // The card quotes the assessment, and the close gate caps it at 500.
      it('quotes the opening paragraph of the rationale, cut to what the card carries', () => {
        expect(
          render(
            'assessment',
            'confirmed_incident',
            'Ransomware staged on web-01. Containment is justified.\n\n## Affected hosts\n- web-01'
          )
        ).toBe('Ransomware staged on web-01. Containment is justified.');
        expect(render('assessment', 'confirmed_incident', 'x'.repeat(900))).toHaveLength(500);
        expect(render('assessment', 'confirmed_incident', undefined)).toBe('');
      });

      it('counts the attack alerts an approved close can reach, 0 when it lists none', () => {
        const count = (alertIds?: string[]) =>
          evaluate(verdictStep.attack_alert_count, {
            steps: {
              fetch_attack_discovery_alert: {
                output: {
                  hits: {
                    hits: [
                      {
                        _source:
                          alertIds === undefined
                            ? {}
                            : { 'kibana.alert.attack_discovery.alert_ids': alertIds },
                      },
                    ],
                  },
                },
              },
            },
          });
        expect(count(['a', 'b', 'c'])).toBe(3);
        expect(count([])).toBe(0);
        expect(count(undefined)).toBe(0);
      });

      it('is resolved after the autonomy level and before any proposal is resolved', () => {
        const names = allSteps.map(({ name }) => name);
        expect(names.indexOf('resolve_verdict')).toBeGreaterThan(names.indexOf('resolve_autonomy'));
        expect(names.indexOf('resolve_verdict')).toBeLessThan(
          names.indexOf('resolve_proposal_slots')
        );
        expect(stepByName('resolve_close_reason')).toBeUndefined();
      });

      // No containment over activity the analysis explained as benign, whatever the
      // agent put in `recommendedActions`. The counts then read `0` and the close
      // question is asked right away, as a false-positive one.
      it('proposes no containment on a not_an_incident verdict, and asks the close question instead', () => {
        const slotsIf = String(stepByName('resolve_proposal_slots')?.if);
        const queuedIf = String(stepByName('journal_proposals_queued')?.if);
        const askIf = String(stepByName('resolve_close_question')?.with?.after_analysis);
        const context = (verdict: string) =>
          withAgentResult({
            steps: {
              resolve_proposal_dispatch: { output: { failed: 0 } },
              resolve_request: { output: { has_request: true } },
              verify_investigation: { output: { metadata: {} } },
              resolve_run_outcome: { output: { analyzed: true } },
              resolve_verdict: { output: { not_an_incident: verdict === 'not_an_incident' } },
              forensic_analysis: {
                output: {
                  structured_output: {
                    verdict,
                    propose: true,
                    recommendedActions: [{ actionWorkflowId: 'isolate' }],
                  },
                },
              },
              resolve_proposal_counts: {
                output: { new_count: 0, already_open_count: 0, check_failed: false },
              },
            },
          });

        expect(evaluate(slotsIf, context('confirmed_incident'))).toBe(true);
        expect(evaluate(queuedIf, context('confirmed_incident'))).toBe(true);
        expect(evaluate(slotsIf, context('not_an_incident'))).toBe(false);
        expect(evaluate(queuedIf, context('not_an_incident'))).toBe(false);
        expect(evaluate(askIf, context('not_an_incident'))).toBe(true);
      });

      it('says when it dropped the recommendations the agent listed anyway', () => {
        const note = stepByName('journal_verdict_dropped_actions');
        const condition = String(note?.if);
        const context = (notAnIncident: boolean, actions: number) => ({
          steps: {
            resolve_run_outcome: { output: { analyzed: true } },
            resolve_verdict: { output: { not_an_incident: notAnIncident } },
            forensic_analysis: {
              output: { structured_output: { recommendedActions: new Array(actions).fill({}) } },
            },
          },
        });

        expect(note?.type).toBe('workflow.execute');
        expect(note?.['on-failure']).toEqual({ continue: true });
        expect(evaluate(condition, context(true, 2))).toBe(true);
        expect(evaluate(condition, context(true, 0))).toBe(false);
        expect(evaluate(condition, context(false, 2))).toBe(false);

        const message = String((note?.with as { inputs?: { message?: string } })?.inputs?.message);
        expect(liquid.parseAndRenderSync(message, context(true, 2))).toBe(
          'Verdict was not an incident; 2 recommended action(s) were not proposed.'
        );

        const names = allSteps.map(({ name }) => name);
        expect(names.indexOf('journal_verdict_dropped_actions')).toBeLessThan(
          names.indexOf('journal_close_question')
        );
      });

      it('writes the verdict on the indicator with the processed status', () => {
        const attributes = (stepByName('mark_processed')?.with?.ki as { attributes?: unknown })
          ?.attributes;
        expect(attributes).toEqual({
          status: 'processed',
          forensic_verdict: '{{ steps.resolve_verdict.output.value }}',
        });
      });
    });

    // No containment gate will ask when this run queued no proposal and none of its
    // recommendations is already pending here, so the run asks right away through
    // the same close gate. A pending proposal already on the investigation has a gate
    // that will ask, and a failed check is journaled as lost instead.
    describe('asks right away when nothing was proposed', () => {
      const dispatch = stepByName('dispatch_close_gate');
      const note = stepByName('journal_close_question');
      const inputs = (dispatch?.with as { inputs?: Record<string, unknown> })?.inputs ?? {};
      const closeGate = parse(ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW.yaml) as {
        triggers?: Array<{
          inputs?: {
            required?: string[];
            properties?: Record<string, unknown>;
            additionalProperties?: boolean;
          };
        }>;
      };

      it('dispatches the close gate asynchronously by its registered id, and never fails over it', () => {
        expect(dispatch?.type).toBe('workflow.executeAsync');
        expect((dispatch?.with as { 'workflow-id'?: string })?.['workflow-id']).toBe(
          ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW.id
        );
        expect((dispatch?.with as { 'run-as-mode'?: string })?.['run-as-mode']).toBe('inherit');
        expect(dispatch?.['on-failure']).toEqual({ continue: true });
      });

      it('satisfies the close gate trigger schema', () => {
        const gateInputs = closeGate.triggers?.[0]?.inputs;
        const provided = Object.keys(inputs);
        const declared = Object.keys(gateInputs?.properties ?? {});

        expect((gateInputs?.required ?? []).filter((key) => !provided.includes(key))).toEqual([]);
        expect(gateInputs?.additionalProperties).toBe(false);
        expect(provided.filter((key) => !declared.includes(key))).toEqual([]);
        expect(inputs).toEqual({
          investigationConversationId: '{{ steps.resolve_request.output.investigation_id }}',
          attackDiscoveryId: '{{ steps.fetch_attack_discovery_alert.output.hits.hits[0]._id }}',
          closeReason: '{{ steps.resolve_verdict.output.close_reason }}',
          attackReason: '{{ steps.resolve_verdict.output.attack_reason }}',
          assessment: '{{ steps.resolve_verdict.output.assessment }}',
          attackAlertCount: '${{ steps.resolve_verdict.output.attack_alert_count }}',
          caveat: '{{ steps.resolve_close_question.output.caveat }}',
        });
      });

      // Approving a close while containment never reached the queue would drop it silently,
      // so the card leads with what went wrong and what to raise by hand.
      it('hands the close card what went wrong before the question', () => {
        const caveat = String(stepByName('resolve_close_question')?.with?.caveat);
        const actions = [
          { title: 'Isolate host web-01', actionWorkflowId: 'isolate' },
          { title: 'Kill svc.exe (PID 1) on web-01', actionWorkflowId: 'kill' },
        ];
        const render = (steps: Record<string, unknown>) =>
          liquid.parseAndRenderSync(caveat, { steps });

        expect(
          render({
            resolve_proposal_counts: { output: { check_failed: true } },
            forensic_analysis: { output: { structured_output: { recommendedActions: actions } } },
          })
        ).toBe(
          [
            'Containment was never proposed: endpoint analysis could not check whether these proposals already exist, so none was created. Raise them by hand if they are still needed:',
            '',
            '- Isolate host web-01 (`isolate`)',
            '- Kill svc.exe (PID 1) on web-01 (`kill`)',
          ].join('\n')
        );
        expect(
          render({
            resolve_proposal_counts: { output: { check_failed: false } },
            resolve_proposal_dispatch: { output: { failed: 1 } },
            propose_actions: {
              output: {
                results: [
                  { status: 'completed', key: actions[0], output: { status: 'failed' } },
                  { status: 'completed', key: actions[1], output: { status: 'running' } },
                ],
              },
            },
          })
        ).toBe(
          [
            '1 containment proposal(s) did not reach the approval queue. Raise them by hand if they are still needed:',
            '',
            '- Isolate host web-01 (`isolate`)',
          ].join('\n')
        );
        expect(
          render({
            resolve_proposal_dispatch: { output: { failed: 0 } },
            resolve_run_outcome: { output: { outcome_unrecorded: true } },
          })
        ).toContain('An earlier endpoint analysis attached findings here but did not record');
        // Nothing went wrong: the card reads as before.
        expect(
          render({
            resolve_proposal_counts: { output: { check_failed: false } },
            resolve_proposal_dispatch: { output: { failed: 0 } },
            resolve_run_outcome: { output: { outcome_unrecorded: false } },
          })
        ).toBe('');
      });

      it("asks when none of this run's proposals reached the queue, or after an unrecorded outcome", () => {
        expect(note?.if).toBe('${{ steps.resolve_close_question.output.after_analysis == true }}');
        expect(dispatch?.if).toContain(
          'steps.resolve_close_question.output.after_analysis == true'
        );
        expect(dispatch?.if).toContain(
          'steps.resolve_close_question.output.after_unrecorded == true'
        );
        const names = allSteps.map(({ name }) => name);
        for (const [before, after] of [
          ['propose_actions', 'resolve_proposal_dispatch'],
          ['resolve_proposal_dispatch', 'resolve_close_question'],
          ['check_pending_proposals', 'resolve_close_question'],
          ['check_executing_proposals', 'resolve_close_question'],
          ['resolve_close_question', 'journal_close_question'],
          ['journal_close_question', 'dispatch_close_gate'],
          ['dispatch_close_gate', 'resolve_proposals'],
        ]) {
          expect(names.indexOf(before)).toBeLessThan(names.indexOf(after));
        }

        const afterAnalysis = String(stepByName('resolve_close_question')?.with?.after_analysis);
        const when = (overrides: {
          analyzed?: boolean;
          newCount?: number;
          failed?: number;
          alreadyOpen?: number;
        }) =>
          withAgentResult({
            steps: {
              // A partial attach does not hold the close question back.
              resolve_run_outcome: {
                output: { analyzed: overrides.analyzed ?? true, attached: false },
              },
              forensic_analysis:
                overrides.analyzed === false ? {} : { output: { structured_output: {} } },
              resolve_proposal_counts: {
                output: {
                  new_count: overrides.newCount ?? 0,
                  already_open_count: overrides.alreadyOpen ?? 0,
                },
              },
              resolve_proposal_dispatch: { output: { failed: overrides.failed ?? 0 } },
            },
          });

        // Proposed nothing, every recommendation converged elsewhere, or the dedup check
        // failed (it creates nothing, so `new_count` is 0).
        expect(evaluate(afterAnalysis, when({}))).toBe(true);
        // Every new proposal was rejected: nothing reached the queue, so no gate will ask.
        expect(evaluate(afterAnalysis, when({ newCount: 2, failed: 2 }))).toBe(true);
        // A containment gate on this investigation will ask on settlement.
        expect(evaluate(afterAnalysis, when({ newCount: 1 }))).toBe(false);
        expect(evaluate(afterAnalysis, when({ newCount: 2, failed: 1 }))).toBe(false);
        expect(evaluate(afterAnalysis, when({ alreadyOpen: 1 }))).toBe(false);
        // Nothing to ask about when this run analyzed nothing.
        expect(evaluate(afterAnalysis, when({ analyzed: false }))).toBe(false);

        // An earlier run's outcome is unrecorded: ask only when nothing is pending or
        // executing. A failed read leaves no total, which does not read as "nothing open".
        const afterUnrecorded = String(
          stepByName('resolve_close_question')?.with?.after_unrecorded
        );
        const unrecorded = (
          unrec: boolean,
          pending?: Record<string, unknown>,
          executing?: Record<string, unknown>,
          investigationStatus = 'open'
        ) => ({
          steps: {
            verify_investigation: { output: { metadata: { status: investigationStatus } } },
            resolve_run_outcome: { output: { outcome_unrecorded: unrec } },
            check_pending_proposals: pending ?? {},
            check_executing_proposals: executing ?? {},
          },
        });
        const total = (value: number) => ({ output: { total: value } });
        expect(evaluate(afterUnrecorded, unrecorded(true, total(0), total(0)))).toBe(true);
        expect(evaluate(afterUnrecorded, unrecorded(true, total(1), total(0)))).toBe(false);
        // An approved action still running is not pending, but is not settled either.
        expect(evaluate(afterUnrecorded, unrecorded(true, total(0), total(1)))).toBe(false);
        // An analyst already closed it: asking would reopen it.
        expect(evaluate(afterUnrecorded, unrecorded(true, total(0), total(0), 'closed'))).toBe(
          false
        );
        expect(evaluate(afterUnrecorded, unrecorded(true, undefined, total(0)))).toBe(false);
        expect(evaluate(afterUnrecorded, unrecorded(true, total(0)))).toBe(false);
        expect(evaluate(afterUnrecorded, unrecorded(false, total(0), total(0)))).toBe(false);
        for (const [name, status] of [
          ['check_pending_proposals', 'pending'],
          ['check_executing_proposals', 'executing'],
        ]) {
          const step = stepByName(name);
          expect(step?.if).toBe(
            '${{ steps.resolve_run_outcome.output.outcome_unrecorded == true }}'
          );
          expect(step?.['on-failure']).toEqual({ continue: true });
          expect((step?.with as { query?: { status?: string } })?.query?.status).toBe(status);
        }
      });

      it('says so on the investigation first, and runs after the containment dispatch', () => {
        expect(note?.type).toBe('workflow.execute');
        expect(note?.['on-failure']).toEqual({ continue: true });
        const message = String((note?.with as { inputs?: { message?: string } })?.inputs?.message);
        const render = (notAnIncident: boolean) =>
          liquid.parseAndRenderSync(message, {
            steps: {
              resolve_host: { output: { host_name: 'web-01' } },
              resolve_verdict: { output: { not_an_incident: notAnIncident } },
            },
          });
        // States what happened and leaves the question to the close card, which follows
        // and says what an approved close records. A promise here would go unkept if the
        // close gate rejected its dispatch.
        expect(render(false)).toBe(
          'Endpoint analysis of `web-01` is done and queued no containment proposal here.'
        );
        expect(render(true)).toBe(
          'Endpoint analysis of `web-01` found no real incident, so no containment was proposed.'
        );
        expect(message).not.toContain('asked next');

        const names = allSteps.map(({ name }) => name);
        expect(names.indexOf('journal_close_question')).toBeGreaterThan(
          names.indexOf('write_convergence_notes')
        );
        expect(names.indexOf('dispatch_close_gate')).toBeGreaterThan(
          names.indexOf('journal_close_question')
        );
        expect(names.indexOf('dispatch_close_gate')).toBeLessThan(
          names.indexOf('resolve_proposals')
        );
      });
    });

    // A recommendation a live Proposal already holds, on this Investigation or another,
    // must not become a second card. The step resolves each recommendation to a
    // deterministic id and returns only the ones nothing holds yet; the rest are
    // journaled as converged on the Proposal that does.
    describe('resolves each recommendation against the Proposals already live', () => {
      const slots = stepByName('resolve_proposal_slots');
      const counts = stepByName('resolve_proposal_counts')?.with as Record<string, string>;

      it('runs the shared dedup step over the agent list', () => {
        expect(slots?.type).toBe('alertzero.resolveProposals');
        expect(slots?.with).toEqual({
          investigationConversationId: '{{ steps.resolve_request.output.investigation_id }}',
          proposals: '${{ steps.forensic_analysis.output.structured_output.recommendedActions }}',
        });
        // A failed check must not fail the run after the agent; it is journaled and
        // retires the indicator below instead.
        expect(slots?.['on-failure']).toEqual({ continue: true });
      });

      it('derives every later gate from the step output, all off when it was skipped', () => {
        const skipped = { steps: {} };
        expect(evaluate(counts.new_count, skipped)).toBe(0);
        expect(evaluate(counts.converged_count, skipped)).toBe(0);
        expect(evaluate(counts.already_open_count, skipped)).toBe(0);
        expect(evaluate(counts.check_failed, skipped)).toBe(false);

        const resolved = {
          steps: {
            resolve_proposal_slots: {
              output: {
                proposals: [{}, {}],
                converged: [{}],
                alreadyOpenCount: 3,
                mintSuppression: 'none',
              },
            },
          },
        };
        expect(evaluate(counts.new_count, resolved)).toBe(2);
        expect(evaluate(counts.converged_count, resolved)).toBe(1);
        expect(evaluate(counts.already_open_count, resolved)).toBe(3);
        expect(evaluate(counts.check_failed, resolved)).toBe(false);
      });

      // Two ways the check can fail: the step reported it could not count, or the step
      // itself threw and `continue: true` recorded the error.
      it('treats a suppressed mint or a thrown step as a failed check', () => {
        expect(
          evaluate(counts.check_failed, {
            steps: {
              resolve_proposal_slots: {
                output: { proposals: [], converged: [], mintSuppression: 'check_failed' },
              },
            },
          })
        ).toBe(true);
        expect(
          evaluate(counts.check_failed, {
            steps: { resolve_proposal_slots: { error: { message: 'boom' } } },
          })
        ).toBe(true);
      });

      it('writes one convergence note per recommendation another Proposal holds', () => {
        const notes = stepByName('write_convergence_notes');
        expect(notes?.type).toBe('parallel');
        expect(notes?.mode).toBe('settled');
        expect(notes?.if).toBe('${{ steps.resolve_proposal_counts.output.converged_count > 0 }}');
        expect(notes?.foreach).toBe('${{ steps.resolve_proposal_slots.output.converged }}');
        expect(stepByName('write_convergence_note')).toMatchObject({
          type: 'workflow.execute',
          with: {
            'workflow-id': 'system-alertzero-journal-note',
            'run-as-mode': 'inherit',
            inputs: {
              conversation_id: '{{ steps.resolve_request.output.investigation_id }}',
              message: '{{ foreach.item.note }}',
            },
          },
        });
        const names = allSteps.map(({ name }) => name);
        expect(names.indexOf('propose_actions')).toBeLessThan(
          names.indexOf('write_convergence_notes')
        );
      });

      it('reports the dedup totals in the queued note', () => {
        const message = String(
          (stepByName('journal_proposals_queued')?.with as { inputs?: { message?: string } })
            ?.inputs?.message
        );
        const render = (
          newCount: number,
          convergedCount: number,
          alreadyOpenCount: number,
          level = 'manual'
        ) =>
          liquid.parseAndRenderSync(message, {
            steps: {
              resolve_host: { output: { host_name: 'web-01' } },
              resolve_autonomy: { output: { level } },
              resolve_proposal_counts: {
                output: {
                  new_count: newCount,
                  converged_count: convergedCount,
                  already_open_count: alreadyOpenCount,
                },
              },
            },
          });

        expect(render(2, 0, 0)).toBe(
          'Endpoint analysis of `web-01` is submitting 2 containment proposal(s) for analyst approval. Once every proposal on it has been decided, you are asked whether to close the investigation.'
        );
        expect(render(1, 0, 0, 'supervised')).toContain('for auto-approval.');
        expect(render(1, 2, 1)).toBe(
          'Endpoint analysis of `web-01` is submitting 1 containment proposal(s) for analyst approval. 2 already raised by another Investigation. 1 already open on this investigation. Once every proposal on it has been decided, you are asked whether to close the investigation.'
        );
        // Nothing new and nothing pending here: the close note and card follow at once,
        // so this note does not repeat the question.
        expect(render(0, 1, 0)).toBe(
          'Endpoint analysis of `web-01` found containment worth proposing, but every proposal it would have raised already exists, so none was created. 1 already raised by another Investigation.'
        );
        // Nothing new, but a proposal already pending here has a gate that will ask.
        expect(render(0, 0, 1)).toBe(
          'Endpoint analysis of `web-01` found containment worth proposing, but every proposal it would have raised already exists, so none was created. 1 already open on this investigation. Once every proposal on it has been decided, you are asked whether to close the investigation.'
        );
      });

      it('surfaces the new and converged counts on the run output', () => {
        const outputs = (
          definition as unknown as {
            outputs?: { properties?: Record<string, { type?: string }> };
          }
        ).outputs?.properties;
        expect(outputs?.proposals_submitted).toMatchObject({ type: 'number' });
        expect(outputs?.proposals_converged).toMatchObject({ type: 'number' });
        expect(stepByName('emit_result')?.with).toMatchObject({
          proposals_submitted:
            '${{ steps.resolve_proposal_counts.output.new_count | default: 0 | minus: steps.resolve_proposal_dispatch.output.failed | at_least: 0 }}',
          proposals_converged:
            '${{ steps.resolve_proposal_counts.output.converged_count | default: 0 }}',
        });
      });
    });

    // A rejected dispatch used to be swallowed, and the findings alone then closed
    // the indicator. The recommendation lives only in this run's agent output, so
    // the next sweep would skip the agent and never queue it.
    it('retires the indicator when a containment proposal is rejected', () => {
      const dispatch = stepByName('propose_actions');
      expect(dispatch?.type).toBe('parallel');
      expect(dispatch?.mode).toBe('settled');
      expect(dispatch?.concurrency?.max).toBe(8);
      const recommendedActions = schema?.properties?.recommendedActions as { maxItems?: unknown };
      // Typed expression: `{{ }}` would leave maxItems a string, which Claude rejects.
      expect(recommendedActions?.maxItems).toBe('${{ consts.max_recommended_actions }}');
      expect(
        evaluate(String(recommendedActions?.maxItems), {
          consts: { max_recommended_actions: 8 },
        })
      ).toBe(8);
      expect(dispatch?.['on-failure']).toBeUndefined();
      expect(stepByName('propose_action')?.['on-failure']).toBeUndefined();

      const lost = String(stepByName('resolve_proposals')?.with?.proposals_lost);
      expect(
        evaluate(lost, {
          steps: {
            forensic_analysis: { output: { structured_output: { propose: true } } },
            resolve_proposal_dispatch: { output: { failed: 1 } },
          },
        })
      ).toBe(true);
      expect(
        evaluate(lost, {
          steps: {
            forensic_analysis: { output: { structured_output: { propose: true } } },
            resolve_proposal_dispatch: { output: { failed: 0 } },
          },
        })
      ).toBe(false);
      expect(
        evaluate(lost, {
          steps: {
            forensic_analysis: { output: { structured_output: { propose: false } } },
            resolve_proposal_dispatch: { output: { failed: 1 } },
          },
        })
      ).toBe(false);
      // A failed dedup check created nothing either, and a retry would skip the agent.
      expect(
        evaluate(lost, {
          steps: {
            forensic_analysis: { output: { structured_output: { propose: true } } },
            resolve_proposal_dispatch: { output: { failed: 0 } },
            resolve_proposal_counts: { output: { check_failed: true } },
          },
        })
      ).toBe(true);
      // A close question that never reached its gate is lost too, whatever the agent proposed.
      expect(
        evaluate(lost, {
          steps: {
            forensic_analysis: { output: { structured_output: { propose: false } } },
            resolve_proposal_dispatch: { output: { failed: 0 } },
            resolve_close_question: { output: { after_analysis: true } },
            dispatch_close_gate: { output: { status: 'failed' } },
          },
        })
      ).toBe(true);
      const lostMessage = String(
        (stepByName('journal_proposals_lost')?.with as { inputs?: { message?: string } })?.inputs
          ?.message
      );
      expect(
        liquid.parseAndRenderSync(lostMessage, {
          steps: {
            resolve_host: { output: { host_name: 'web-01' } },
            resolve_proposal_counts: { output: { check_failed: true } },
          },
        })
      ).toContain('could not check whether those proposals already exist');
      // Nothing was created, so the agent's own list is what the analyst raises by hand.
      expect(
        liquid.parseAndRenderSync(lostMessage, {
          steps: {
            resolve_host: { output: { host_name: 'web-01' } },
            resolve_proposal_counts: { output: { check_failed: true } },
            forensic_analysis: {
              output: {
                structured_output: {
                  recommendedActions: [
                    { title: 'Isolate host web-01', actionWorkflowId: 'isolate' },
                    { title: 'Kill svc.exe (PID 1) on web-01', actionWorkflowId: 'kill' },
                  ],
                },
              },
            },
          },
        })
      ).toBe(
        [
          'Endpoint analysis of `web-01` finished and found containment worth proposing, but could not check whether those proposals already exist, so none was created:',
          '',
          '- Isolate host web-01 (`isolate`)',
          '- Kill svc.exe (PID 1) on web-01 (`kill`)',
          '',
          'The indicator was retired and will not be retried.',
        ].join('\n')
      );
      expect(
        liquid.parseAndRenderSync(lostMessage, {
          steps: {
            resolve_host: { output: { host_name: 'web-01' } },
            resolve_proposal_counts: { output: { check_failed: false } },
            resolve_proposal_dispatch: { output: { failed: 2 } },
          },
        })
      ).toContain('2 containment proposal(s) did not');
      // Each lost dispatch is named, so the analyst knows what to raise by hand: a gate that
      // started and failed is linked by its execution; a step that failed has none.
      expect(
        liquid.parseAndRenderSync(lostMessage, {
          kibanaUrl: 'https://kibana',
          workflow: { spaceId: 'default' },
          steps: {
            resolve_host: { output: { host_name: 'web-01' } },
            resolve_proposal_counts: { output: { check_failed: false } },
            resolve_proposal_dispatch: { output: { failed: 2 } },
            propose_actions: {
              output: {
                results: [
                  {
                    status: 'completed',
                    key: { title: 'Kill svc.exe (PID 1) on web-01', actionWorkflowId: 'kill' },
                    output: { status: 'running', executionId: 'gate-ok' },
                  },
                  {
                    status: 'completed',
                    key: { title: 'Isolate host web-01', actionWorkflowId: 'isolate' },
                    output: { status: 'failed', executionId: 'gate-1', workflowId: 'gate' },
                  },
                  {
                    status: 'failed',
                    key: {
                      title: 'Suspend svc.exe (PID 1) on web-01',
                      actionWorkflowId: 'suspend',
                    },
                  },
                ],
              },
            },
          },
        })
      ).toBe(
        [
          'Endpoint analysis of `web-01` finished, but 2 containment proposal(s) did not reach the approval queue:',
          '',
          '- Isolate host web-01 (`isolate`): its approval gate failed. [See the gate execution](https://kibana/app/workflows/gate?executionId=gate-1&tab=executions).',
          '- Suspend svc.exe (PID 1) on web-01 (`suspend`).',
          '',
          'The indicator was retired and will not be retried.',
        ].join('\n')
      );
      // Outside the default space the link carries the space, like `execution.url`.
      expect(
        liquid.parseAndRenderSync(lostMessage, {
          kibanaUrl: 'https://kibana',
          workflow: { spaceId: 'team-a' },
          steps: {
            resolve_host: { output: { host_name: 'web-01' } },
            resolve_proposal_dispatch: { output: { failed: 1 } },
            propose_actions: {
              output: {
                results: [
                  {
                    status: 'completed',
                    key: { title: 'Isolate host web-01', actionWorkflowId: 'isolate' },
                    output: { status: 'failed', executionId: 'gate-1', workflowId: 'gate' },
                  },
                ],
              },
            },
          },
        })
      ).toContain('(https://kibana/s/team-a/app/workflows/gate?executionId=gate-1&tab=executions)');
      expect(
        liquid.parseAndRenderSync(lostMessage, {
          steps: {
            resolve_host: { output: { host_name: 'web-01' } },
            resolve_proposal_counts: { output: { check_failed: false } },
            resolve_proposal_dispatch: { output: { failed: 0 } },
            resolve_proposals: { output: { close_gate_failed: true } },
          },
        })
      ).toContain('the question whether to close this investigation could not be raised');
      // The close dispatch failing too must not replace the lost list: the close card that
      // would have carried it never exists.
      const closeFailed = { resolve_proposals: { output: { close_gate_failed: true } } };
      const rejected = liquid.parseAndRenderSync(lostMessage, {
        kibanaUrl: 'https://kibana',
        workflow: { spaceId: 'default' },
        steps: {
          resolve_host: { output: { host_name: 'web-01' } },
          resolve_proposal_counts: { output: { check_failed: false } },
          resolve_proposal_dispatch: { output: { failed: 1 } },
          propose_actions: {
            output: {
              results: [
                {
                  status: 'completed',
                  key: { title: 'Isolate host web-01', actionWorkflowId: 'isolate' },
                  output: { status: 'failed', executionId: 'gate-1', workflowId: 'gate' },
                },
              ],
            },
          },
          ...closeFailed,
        },
      });
      expect(rejected).toContain('- Isolate host web-01 (`isolate`)');
      expect(rejected).toContain('executionId=gate-1');
      expect(rejected).toContain('could not be raised either, so nothing will ask it.');
      expect(rejected.match(/The indicator was retired/g)).toHaveLength(1);
      const checkFailedAndClose = liquid.parseAndRenderSync(lostMessage, {
        steps: {
          resolve_host: { output: { host_name: 'web-01' } },
          resolve_proposal_counts: { output: { check_failed: true } },
          forensic_analysis: {
            output: {
              structured_output: {
                recommendedActions: [{ title: 'Isolate host web-01', actionWorkflowId: 'isolate' }],
              },
            },
          },
          ...closeFailed,
        },
      });
      expect(checkFailedAndClose).toContain('- Isolate host web-01 (`isolate`)');
      expect(checkFailedAndClose).toContain('could not be raised either, so nothing will ask it.');
      expect(checkFailedAndClose.match(/The indicator was retired/g)).toHaveLength(1);
      const reason = String(
        (
          stepByName('mark_proposals_failed')?.with as {
            ki?: { attributes?: { failure_reason?: string } };
          }
        )?.ki?.attributes?.failure_reason
      );
      expect(
        liquid
          .parseAndRenderSync(reason, {
            steps: {
              resolve_request: { output: { investigation_id: 'inv-1' } },
              resolve_proposals: { output: { close_gate_failed: true } },
            },
          })
          .replace(/\s+/g, ' ')
      ).toBe('Could not raise the close question on investigation inv-1');
      const reasonWith = (steps: Record<string, unknown>) =>
        liquid
          .parseAndRenderSync(reason, {
            steps: { resolve_request: { output: { investigation_id: 'inv-1' } }, ...steps },
          })
          .replace(/\s+/g, ' ');
      expect(
        reasonWith({
          resolve_proposal_dispatch: { output: { failed: 2 } },
          ...closeFailed,
        })
      ).toBe(
        'Containment proposals did not reach the queue for investigation inv-1 and could not raise the close question'
      );
      expect(
        reasonWith({
          resolve_proposal_counts: { output: { check_failed: true } },
          ...closeFailed,
        })
      ).toBe(
        'Could not check for existing proposals on investigation inv-1, so none was created and could not raise the close question'
      );
      expect(reasonWith({ resolve_proposal_dispatch: { output: { failed: 2 } } })).toBe(
        'Containment proposals did not reach the queue for investigation inv-1'
      );

      const processed = String(stepByName('mark_processed')?.if);
      const retired = String(stepByName('mark_proposals_failed')?.if);
      const ready = {
        steps: {
          resolve_request: { output: { has_request: true } },
          verify_investigation: { output: { metadata: { id: 'inv-1' } } },
          resolve_run_outcome: { output: { settled: true } },
          resolve_proposals: { output: { proposals_lost: false } },
        },
      };
      expect(evaluate(processed, ready)).toBe(true);
      expect(evaluate(retired, ready)).toBe(false);
      expect(
        evaluate(processed, {
          steps: {
            ...ready.steps,
            resolve_proposals: { output: { proposals_lost: true } },
          },
        })
      ).toBe(false);
      expect(
        evaluate(retired, {
          steps: {
            ...ready.steps,
            resolve_proposals: { output: { proposals_lost: true } },
          },
        })
      ).toBe(true);

      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('journal_proposals_lost')).toBeLessThan(
        names.indexOf('mark_proposals_failed')
      );
      expect(stepByName('journal_proposals_lost')?.['on-failure']).toEqual({ continue: true });
      expect(stepByName('journal_proposals_queued')?.['on-failure']).toEqual({ continue: true });
      const queued = String(stepByName('journal_proposals_queued')?.if);
      const queuedWhen = (propose: boolean, recommended: number, analyzed: boolean) => ({
        steps: {
          resolve_request: { output: { has_request: true } },
          verify_investigation: { output: { metadata: { id: 'inv-1' } } },
          resolve_run_outcome: { output: { analyzed } },
          forensic_analysis: {
            output: {
              structured_output: {
                propose,
                recommendedActions: Array.from({ length: recommended }, () => ({})),
              },
            },
          },
        },
      });
      expect(evaluate(queued, queuedWhen(true, 2, true))).toBe(true);
      expect(evaluate(queued, queuedWhen(true, 0, true))).toBe(false);
      expect(evaluate(queued, queuedWhen(false, 2, true))).toBe(false);
      expect(evaluate(queued, queuedWhen(true, 2, false))).toBe(false);
      // A failed check is narrated by `journal_proposals_lost`, not as queued.
      expect(
        evaluate(queued, {
          steps: {
            ...queuedWhen(true, 2, true).steps,
            resolve_proposal_counts: { output: { check_failed: true } },
          },
        })
      ).toBe(false);
      expect(stepByName('journal_proposals_lost')?.if).toBe(
        stepByName('mark_proposals_failed')?.if
      );
    });

    // `workflow.executeAsync` completes even when the gate rejects its inputs, and reports that
    // gate as `failed` in its output. Counting only failed steps let a rejected proposal, or a
    // rejected close question, retire the indicator as processed with nothing left to ask.
    it('counts a dispatch whose gate failed to start as failed', () => {
      const failed = String(stepByName('resolve_proposal_dispatch')?.with?.failed);
      const results = (...entries: Array<Record<string, unknown>>) => ({
        steps: { propose_actions: { output: { results: entries } } },
      });
      expect(
        evaluate(
          failed,
          results(
            { status: 'completed', output: { status: 'running' } },
            { status: 'completed', output: { status: 'failed' } },
            { status: 'failed' }
          )
        )
      ).toBe(2);
      expect(
        evaluate(failed, results({ status: 'completed', output: { status: 'pending' } }))
      ).toBe(0);
      // Skipped: nothing was dispatched.
      expect(evaluate(failed, { steps: {} })).toBe(0);

      const closeGate = String(stepByName('resolve_proposals')?.with?.close_gate_failed);
      const asked = (dispatch: Record<string, unknown>, afterAnalysis = true) => ({
        steps: {
          resolve_close_question: { output: { after_analysis: afterAnalysis } },
          dispatch_close_gate: dispatch,
        },
      });
      expect(evaluate(closeGate, asked({ output: { status: 'failed' } }))).toBe(true);
      expect(evaluate(closeGate, asked({ error: { message: 'Workflow not found' } }))).toBe(true);
      expect(evaluate(closeGate, asked({ output: { status: 'pending' } }))).toBe(false);
      expect(evaluate(closeGate, asked({}))).toBe(false);
      // After an unrecorded outcome the indicator is retired as failed anyway.
      expect(evaluate(closeGate, asked({ output: { status: 'failed' } }, false))).toBe(false);
    });

    it('points the agent at each entry inputSchema rather than a fixed shape', () => {
      const message = stepByName('forensic_analysis')?.with?.message as string;
      expect(message).toContain('inputSchema.properties.actionInput');
      expect(message).toContain('not against `inputSchema` itself');
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
      expect(whenKiValid?.else?.map(({ name }) => name)).toEqual([
        'journal_invalid_request',
        'mark_invalid',
      ]);
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

    // When the investigation id is the missing field there is nowhere to write.
    it('explains itself on the investigation when there is one', () => {
      const journal = stepByName('journal_invalid_request');
      expect(whenKiValid?.else?.map(({ name }) => name)).toContain('journal_invalid_request');
      expect(journal?.type).toBe('workflow.execute');
      expect(journal?.if).toContain('investigation_id');
      expect((journal?.with as { inputs?: Record<string, unknown> })?.inputs?.conversation_id).toBe(
        '{{ steps.resolve_request.output.investigation_id }}'
      );
    });
  });
});
