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
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '../proposals';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  if?: string;
  condition?: string;
  mode?: string;
  concurrency?: { max?: number };
  'on-failure'?: { continue?: boolean };
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
    // run takes the valid branch and spends 15m attaching to an investigation it never
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
      field: 'attached' | 'settled',
      found: { ids?: string[]; hostName?: string }
    ): unknown =>
      evaluate(String(stepByName('resolve_run_outcome')?.with?.[field]), {
        steps: {
          finding_ids: { output: thisIndicator },
          resolve_written_findings: { output: { ids: found.ids } },
          resolve_host: { output: { host_name: found.hostName } },
        },
      });

    it('settles a run whose timeline and indicators for this indicator are on the investigation', () => {
      const ids = [thisIndicator.timeline, thisIndicator.iocs];
      expect(outcome('settled', { ids, hostName: 'host-a' })).toBe(true);
      expect(outcome('attached', { ids, hostName: 'host-a' })).toBe(true);
    });

    it('does not settle a run that landed only some of this indicator findings', () => {
      expect(outcome('settled', { ids: [thisIndicator.iocs], hostName: 'host-a' })).toBe(false);
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

    // The failure this whole gate exists for: a host was analyzed and nothing survived.
    it('does not settle a run that analyzed a host and attached nothing', () => {
      expect(outcome('settled', { ids: [], hostName: 'host-a' })).toBe(false);
      expect(outcome('attached', { ids: [], hostName: 'host-a' })).toBe(false);
    });

    // Retired as processed, not failed. A missing read is a 404 here rather than a fault,
    // and no later run resolves a host the discovery does not name.
    it('settles a run that had no host to analyze without claiming it attached anything', () => {
      expect(outcome('settled', { ids: [] })).toBe(true);
      expect(outcome('attached', { ids: [] })).toBe(false);
    });
  });

  // A 15m agent run against an investigation that is gone produces three attachment
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
        '{{ consts.journal_note }}'
    );

    it('narrates problem paths and the assessment as journal notes rather than attachments', () => {
      expect(journalSteps.map(({ name }) => name).sort()).toEqual([
        'journal_analysis_problem',
        'journal_analysis_started',
        'journal_fetch_alert_problem',
        'journal_invalid_request',
        'journal_iocs',
        'journal_no_host',
        'journal_proposals_lost',
        'journal_proposals_queued',
        'journal_rationale',
        'journal_timeline',
      ]);
      expect(definition.consts?.journal_note).toBe('system-alertzero-journal-note');
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
    // longer one whole. The assessment is that message, so the schema cap matches.
    it('caps the assessment at the length a journal note can carry', () => {
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        properties?: { rationale?: { maxLength?: number } };
      };
      const journal = stepByName('journal_rationale');

      expect(schema?.properties?.rationale?.maxLength).toBe(JOURNAL_MESSAGE_MAX_LENGTH);
      expect(journal?.type).toBe('workflow.execute');
      expect((journal?.with as { 'workflow-id'?: string })?.['workflow-id']).toBe(
        '{{ consts.journal_note }}'
      );
      const message = (journal?.with as { inputs?: { message?: string } })?.inputs?.message ?? '';
      expect(message).toContain('{{ steps.forensic_analysis.output.structured_output.rationale }}');
      expect(message).toContain('Rationale for proposed actions');
      expect(message).toContain('Rationale for ending investigation');
      expect(message).toContain('steps.forensic_analysis.output.structured_output.propose == true');
    });

    // The two notes before the agent are the only record of why this run stopped.
    // A failed note fails the run and leaves the indicator pending for a cheap retry.
    // Notes beside a retirement still continue, so a rejected note cannot block the
    // write that stops the sweep.
    it('fails the run when a note before the agent is lost', () => {
      expect(stepByName('journal_fetch_alert_problem')?.['on-failure']).toBeUndefined();
      expect(stepByName('journal_no_host')?.['on-failure']).toBeUndefined();
      expect(stepByName('journal_invalid_request')?.['on-failure']).toEqual({ continue: true });
      expect(stepByName('journal_analysis_problem')?.['on-failure']).toEqual({ continue: true });
      // Before the agent, but a rejected note must not skip the 15m run.
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
    // note introduces one finding, only when that finding has something in it, and it
    // is written before that card. A rejected note must not skip the attachment.
    it('journals each finding separately, and only when it is nonempty', () => {
      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('journal_timeline')).toBeLessThan(names.indexOf('attach_timeline'));
      expect(names.indexOf('attach_timeline')).toBeLessThan(names.indexOf('journal_iocs'));
      expect(names.indexOf('journal_iocs')).toBeLessThan(names.indexOf('attach_iocs'));
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

      const message = (name: string) =>
        (stepByName(name)?.with as { inputs?: { message?: string } })?.inputs?.message ?? '';
      expect(liquid.parseAndRenderSync(message('journal_timeline'), {})).toContain(
        'Reconstructed forensic timeline'
      );
      expect(liquid.parseAndRenderSync(message('journal_iocs'), {})).toContain(
        'Extracted IoCs during forensic analysis'
      );
    });

    // With both findings allowed to be empty, the assessment is the only output that
    // evidences the turn happened at all. Listing it as required does not get there: an
    // empty string satisfies `required`, and `journal_rationale` skips on blank — which
    // would leave a completed analysis with no assessment on the investigation.
    it('requires an assessment with something in it', () => {
      const schema = stepByName('forensic_analysis')?.with?.schema as {
        required?: string[];
        properties?: { rationale?: { minLength?: number } };
      };

      expect(schema?.required).toContain('rationale');
      expect(schema?.properties?.rationale?.minLength).toBeGreaterThan(0);
      expect(stepByName('journal_rationale')?.if).toContain('rationale != blank');
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
        'mark_processed',
        'mark_proposals_failed',
        'mark_unreachable',
      ]);
      for (const step of writes) {
        expect(step['on-failure']).toBeUndefined();
      }
    });

    // The case this exists for is a re-dispatch after a failed retirement: the findings
    // are already attached and the only work left is the write. Paying 15m to rediscover
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

      const runsAgent = (count: number, attemptedAt: string): unknown =>
        evaluate(String(stepByName('forensic_analysis')?.if), {
          steps: {
            resolve_prior_assessment: { output: { count } },
            resolve_request: { output: { forensic_attempted_at: attemptedAt } },
          },
        });

      expect(runsAgent(0, '')).toBe(true);
      expect(runsAgent(1, '')).toBe(true);
      expect(runsAgent(2, '')).toBe(false);
      expect(runsAgent(0, '2026-09-23T14:00:00.000Z')).toBe(false);
      expect(runsAgent(1, '2026-09-23T14:00:00.000Z')).toBe(false);
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
      expect(allSteps.filter(({ type }) => type === 'ai.attachment.read')).toEqual([]);
    });

    // The one step whose failure must not fail the run. Without this the run dies at the
    // agent, `mark_failed` never executes, and the indicator stays `pending` — so the
    // sweep starts another 15m agent run a minute later, and keeps doing it for the whole
    // lookback window. A bad connector or a model outage fails every one of them.
    it('retires an indicator whose analysis failed instead of re-running it every minute', () => {
      expect(stepByName('forensic_analysis')?.['on-failure']).toEqual({ continue: true });

      // Both of these read the agent's error, which only exists downstream of a step that
      // continued past it. They were unreachable while the agent failed the run outright.
      expect(stepByName('journal_analysis_problem')?.with).toMatchObject({
        inputs: { message: expect.stringContaining('steps.forensic_analysis.error') },
      });
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
    });
  });

  // Each action publishes its own input contract as `inputSchema` on its catalog
  // entry, which the model only sees once it has called the catalog — after this
  // schema is fixed. So the contract cannot live here, and a copy of it would pin
  // today's Defend actions onto every future one while drifting from bounds this
  // cannot express. `assertActionInputValid` rejects a bad input at proposal time.
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

    // Without this, `propose: true` and no list at all is valid output. `propose_actions`
    // defaults the missing list to `[]`, so the run fans out to nothing, attaches its
    // findings, and retires the indicator as processed — the containment the analysis
    // just spent 15m justifying disappears with no failure anywhere to show for it.
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
    // never passes on is one the model spends tokens filling for nothing.
    it('asks only for the fields the proposal dispatch passes on', () => {
      expect(Object.keys(recommendation?.properties ?? {}).sort()).toEqual([
        'actionId',
        'actionInput',
        'comment',
        'confidence',
      ]);
      expect(recommendation?.required).toEqual(['actionId', 'actionInput', 'confidence']);
      // A blank id is schema-valid without this, and the proposal workflow treats a
      // blank actionWorkflowId as a no-action card an analyst can approve.
      expect(recommendation?.properties?.actionId).toMatchObject({
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

      expect(proposeAction?.['workflow-id']).toBe(CREATE_PROPOSAL_WORKFLOW_ID);
      expect(inputs?.confidence).toBe("{{ foreach.item.confidence | default: '' }}");
      expect(inputs?.impact).toBeUndefined();
      expect(inputs?.category).toBeUndefined();
    });

    // One gate — the containment proposals — so the dial is the same two levels as
    // Attack Discovery. A missing level fails closed to manual.
    it('auto-approves containment only at supervised autonomy', () => {
      expect(definition.triggers?.[0]?.inputs?.properties?.autonomy?.enum).toEqual([
        'manual',
        'supervised',
      ]);
      expect(definition.triggers?.[0]?.inputs?.required).not.toContain('autonomy');
      expect(definition.consts?.default_autonomy).toBe('manual');

      const level = String(stepByName('resolve_autonomy')?.with?.level);
      expect(evaluate(level, { inputs: {}, consts: { default_autonomy: 'manual' } })).toBe(
        'manual'
      );
      expect(
        evaluate(level, {
          inputs: { autonomy: 'supervised' },
          consts: { default_autonomy: 'manual' },
        })
      ).toBe('supervised');

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

    // The add steps continue on failure, so "the agent proposed" is not "the
    // findings are on the investigation". A card queued before that check is
    // what an approver opens and finds empty. `settled` is also true when there
    // was no host, which must not propose anything.
    it('dispatches containment only after the findings are on the investigation', () => {
      const names = allSteps.map(({ name }) => name);
      expect(names.indexOf('resolve_run_outcome')).toBeLessThan(
        names.indexOf('journal_proposals_queued')
      );
      expect(names.indexOf('journal_proposals_queued')).toBeLessThan(
        names.indexOf('propose_actions')
      );
      expect(names.indexOf('propose_actions')).toBeLessThan(names.indexOf('resolve_proposals'));
      expect(names.indexOf('resolve_proposals')).toBeLessThan(names.indexOf('mark_processed'));

      const gate = String(stepByName('propose_actions')?.if);
      expect(gate).toContain('steps.resolve_run_outcome.output.attached == true');
      expect(gate).not.toContain('settled');

      const when = (attached: boolean, propose: boolean) => ({
        steps: {
          resolve_run_outcome: { output: { attached } },
          forensic_analysis: { output: { structured_output: { propose } } },
        },
      });
      expect(evaluate(gate, when(true, true))).toBe(true);
      expect(evaluate(gate, when(false, true))).toBe(false);
      expect(evaluate(gate, when(true, false))).toBe(false);
    });

    // A rejected dispatch used to be swallowed, and the findings alone then closed
    // the indicator. The recommendation lives only in this run's agent output, so
    // the next sweep would skip the agent and never queue it.
    it('retires the indicator when a containment proposal is rejected', () => {
      const dispatch = stepByName('propose_actions');
      expect(dispatch?.type).toBe('parallel');
      expect(dispatch?.mode).toBe('settled');
      expect(dispatch?.concurrency?.max).toBe('{{ consts.max_recommended_actions }}');
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
      const queuedWhen = (propose: boolean, recommended: number, attached: boolean) => ({
        steps: {
          resolve_request: { output: { has_request: true } },
          verify_investigation: { output: { metadata: { id: 'inv-1' } } },
          resolve_run_outcome: { output: { attached } },
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
      expect(stepByName('journal_proposals_lost')?.if).toBe(
        stepByName('mark_proposals_failed')?.if
      );
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
