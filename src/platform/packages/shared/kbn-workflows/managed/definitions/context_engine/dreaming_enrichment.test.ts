/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineEnrichmentWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW, CONTEXT_ENGINE_ENRICHMENT_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  condition?: string;
  status?: string;
  foreach?: string;
  'on-failure'?: { retry?: unknown };
  'max-iterations'?: unknown;
  steps?: Step[];
  else?: Step[];
  with?: Record<string, unknown>;
}

const findStep = (steps: Step[], name: string): Step => {
  const found = steps
    .map((step) =>
      step.name === name
        ? step
        : (() => {
            try {
              return findStep([...(step.steps ?? []), ...(step.else ?? [])], name);
            } catch {
              return undefined;
            }
          })()
    )
    .find(Boolean);
  if (!found) {
    throw new Error(`No step named '${name}'`);
  }
  return found;
};

const values: ContextEngineEnrichmentWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 90,
  connectorId: 'my-connector',
  instructions: 'Support cases of "Acme".\nSkip {{ small talk }}.',
  factTypes: [{ type: 'preference' }],
  entityTypes: [{ type: 'customer', attributes: ['tier'] }],
  relationshipTypes: [],
  enrichment: {
    selection: 'Customers without a "tier".',
    improvement: 'The tier and renewal date.\nSkip {{ marketing }}.',
    maxDocuments: 3,
  },
};

const render = (overrides: Partial<ContextEngineEnrichmentWorkflowTemplateValues> = {}) =>
  parse(CONTEXT_ENGINE_ENRICHMENT_WORKFLOW.yamlTemplate({ ...values, ...overrides }));
const steps = (): Step[] => render().steps;
const engine = createWorkflowLiquidEngine();
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  engine.evalValueSync(String(expression).slice(3, -2).trim(), scope);
const renderTemplate = (template: unknown, scope: Record<string, unknown>): string =>
  String(engine.parseAndRenderSync(String(template), scope));

const sources = [
  {
    ref: 'esql:1a2b3c4d',
    type: 'esql',
    name: 'FROM support-cases',
    description: 'Full-text search over support-cases',
    indices: ['support-cases'],
  },
  {
    ref: 'connector:notion-1',
    type: 'connector',
    name: 'Team Notion',
    description: 'Notion workspace',
    sub_actions: [
      {
        name: 'searchPageOrDSByTitle',
        description: 'Search pages by title',
        params: '- query (string, required): The title to search for',
      },
    ],
    guidance: 'Search first, then read a page by id.',
  },
  {
    ref: 'connector:broken',
    type: 'connector',
    name: 'Broken',
    description: 'Broken',
    error: 'The connector has no read-only sub-actions enabled.',
  },
];
const candidates = [
  { id: 'entity-customer--acme', type: 'entity.customer', title: 'Acme', reason: 'never_enriched' },
  { id: 'fact-1', type: 'fact.preference', title: 'Acme likes email', reason: 'stale' },
];

describe('CONTEXT_ENGINE_ENRICHMENT_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule, named and keyed apart from dreaming', () => {
    const workflow = render();
    const dreaming = parse(CONTEXT_ENGINE_DREAMING_WORKFLOW.yamlTemplate(values));

    expect(workflow.name).toBe('Enrichment: support-cases');
    expect(workflow.settings.concurrency).toEqual({
      key: 'context-engine-enrichment-support-cases-0123456789abcdef',
      strategy: 'drop',
      max: 1,
    });
    expect(workflow.settings.concurrency.key).not.toBe(dreaming.settings.concurrency.key);
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '90m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('writes the prompts and the cap into the consts exactly as given', () => {
    expect(render().consts).toEqual({
      ai_index_id: 'support-cases',
      connector_id: 'my-connector',
      instructions: values.instructions,
      selection: values.enrichment.selection,
      improvement: values.enrichment.improvement,
      max_documents: 3,
      no_items: [],
    });
  });

  it('checks enrichment is on and a source can be searched before picking items or calling a model', () => {
    const all = steps();

    expect(all.map(({ name }) => name)).toEqual([
      'status',
      'paused',
      'sources',
      'unsearchable',
      'candidates',
      'counts',
      'enrich',
      'dry_run_result',
      'output_result',
    ]);
    expect(all[0]).toEqual(
      expect.objectContaining({
        type: 'context-engine.getDreamingStatus',
        with: { ai_index_id: '{{ consts.ai_index_id }}', source: 'enrichment' },
      })
    );
    expect(findStep(all, 'paused').steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
    expect(findStep(all, 'sources').type).toBe('context-engine.listResearchSources');
    expect(findStep(all, 'unsearchable').condition).toBe('${{ steps.sources.output.usable == 0 }}');
    expect(findStep(all, 'unsearchable').steps).toEqual([
      expect.objectContaining({ type: 'workflow.output', status: 'cancelled' }),
    ]);
    expect(findStep(all, 'candidates')).toEqual(
      expect.objectContaining({
        type: 'context-engine.selectEnrichmentCandidates',
        with: { ai_index_id: '{{ consts.ai_index_id }}', limit: 100 },
      })
    );
  });

  it('asks the model to pick at most the configured number of candidates, with a goal for each', () => {
    const select = findStep(steps(), 'select');
    const prompt = renderTemplate(select.with?.prompt, {
      consts: render().consts,
      steps: { sources: { output: { sources } }, candidates: { output: { candidates } } },
    });

    expect(select['on-failure']).toEqual({ retry: { 'max-attempts': 2, delay: '30s' } });
    expect(prompt).toContain(`ABOUT THE AI INDEX:\n\n${values.instructions}\n`);
    expect(prompt).toContain(`WHICH ITEMS TO IMPROVE:\n\n${values.enrichment.selection}\n`);
    expect(prompt).toContain(`WHAT TO IMPROVE THEM IN:\n\n${values.enrichment.improvement}\n`);
    expect(prompt).toContain('Choose at most 3 of the CANDIDATES');
    expect(prompt).toContain('- Team Notion (connector): Notion workspace');
    expect(prompt).not.toContain('Broken');
    expect(prompt).toContain(
      `CANDIDATES (one per line):\n${JSON.stringify(candidates[0])}\n${JSON.stringify(
        candidates[1]
      )}`
    );
    expect(select.with?.schema).toEqual(expect.objectContaining({ required: ['selected'] }));
  });

  it('falls back to default guidance when the prompts are empty', () => {
    const prompt = renderTemplate(findStep(steps(), 'select').with?.prompt, {
      consts: render({
        instructions: '',
        enrichment: { selection: '', improvement: '', maxDocuments: 10 },
      }).consts,
      steps: { sources: { output: { sources } }, candidates: { output: { candidates } } },
    });

    expect(prompt).toContain('ABOUT THE AI INDEX:\n\nNot described.\n');
    expect(prompt).toContain('WHICH ITEMS TO IMPROVE:\n\nItems that are thin, vague');
    expect(prompt).toContain('WHAT TO IMPROVE THEM IN:\n\nMissing facts');
  });

  it('reads the picked items, at most the cap, and improves only those that were candidates', () => {
    const all = steps();
    const consts = render().consts;
    const selected = [
      { id: 'fact-1', goal: 'a' },
      { id: 'fact-1', goal: 'again' },
      { id: 'not-a-candidate', goal: 'b' },
      { id: 'entity-customer--acme', goal: 'c' },
      { id: 'fact-9', goal: 'd' },
    ];
    const ids = evaluate(findStep(all, 'targets').with?.ids, {
      consts,
      steps: { select: { output: { content: { selected } } } },
    });

    expect(ids).toEqual(['fact-1', 'not-a-candidate', 'entity-customer--acme']);
    expect(
      JSON.parse(
        renderTemplate(findStep(all, 'improve').foreach, {
          steps: {
            candidates: { output: { candidates } },
            targets: {
              output: {
                kis: [{ id: 'fact-1' }, { id: 'not-a-candidate' }, { id: 'entity-customer--acme' }],
              },
            },
          },
        })
      )
    ).toEqual([{ id: 'fact-1' }, { id: 'entity-customer--acme' }]);
  });

  it('researches each item in up to three rounds, until the model is done or plans no search', () => {
    const all = steps();
    const research = findStep(all, 'research');
    const decide = findStep(all, 'decide').with?.research_done;

    expect(findStep(all, 'start').with).toEqual({
      selected: '${{ variables.selected | plus: 1 }}',
      evidence: '${{ consts.no_items }}',
      searches_run: '${{ consts.no_items }}',
      research_errors: '${{ consts.no_items }}',
      research_done: false,
    });
    expect(research.type).toBe('while');
    expect(research.condition).toBe('${{ variables.research_done != true }}');
    expect(research['max-iterations']).toEqual({ limit: 3, 'on-limit': 'continue' });
    expect((research.steps ?? []).map(({ name }) => name)).toEqual(['plan', 'search', 'decide']);
    const done = (content: unknown) =>
      evaluate(decide, { steps: { plan: { output: { content } } } });
    expect(done({ done: true, searches: [{}] })).toBe(true);
    expect(done({ done: false, searches: [] })).toBe(true);
    expect(done({ done: false, searches: [{}] })).toBe(false);
  });

  it('runs at most five searches a round, skipping evidence already found, and collects it', () => {
    const all = steps();
    const searches = Array.from({ length: 7 }, (_, i) => ({ source: `esql:${i}` }));
    const scope = {
      variables: { evidence: [{ id: 'e-1' }], searches_run: [{ source: 'esql:x' }] },
      steps: {
        plan: { output: { content: { searches } } },
        run_searches: {
          output: { evidence: [{ id: 'e-2' }], errors: [{ source: 's', message: 'm' }] },
        },
      },
    };
    const run = findStep(all, 'run_searches');
    const collect = findStep(all, 'collect').with ?? {};

    expect(run.type).toBe('context-engine.searchResearchSources');
    expect(evaluate(run.with?.searches, scope)).toHaveLength(5);
    expect(evaluate(run.with?.skip_evidence_ids, scope)).toEqual(['e-1']);
    expect(evaluate(collect.evidence, scope)).toEqual([{ id: 'e-1' }, { id: 'e-2' }]);
    expect(evaluate(collect.searches_run, scope)).toHaveLength(8);
    expect(evaluate(collect.research_errors, scope)).toEqual([{ source: 's', message: 'm' }]);
  });

  it('shows the research model the goal, the item, the searchable sources and what it found', () => {
    const prompt = renderTemplate(findStep(steps(), 'plan').with?.prompt, {
      consts: render().consts,
      foreach: { item: { id: 'fact-1', title: 'Acme likes email' } },
      variables: {
        evidence: [{ id: 'e-1', source: 'esql:1a2b3c4d', uri: 'index://a/1', text: 'tier: gold' }],
        searches_run: [],
        research_errors: [{ source: 'connector:notion-1', message: 'bad params' }],
      },
      steps: {
        select: { output: { content: { selected: [{ id: 'fact-1', goal: 'the tier of Acme' }] } } },
        sources: { output: { sources } },
      },
    });

    expect(prompt).toContain('GOAL: the tier of Acme');
    expect(prompt).toContain('KNOWLEDGE ITEM:\n{"id":"fact-1","title":"Acme likes email"}');
    expect(prompt).toContain('- ref: esql:1a2b3c4d');
    expect(prompt).toContain('Search it with query: a few keywords.');
    expect(prompt).toContain('sub_action searchPageOrDSByTitle: Search pages by title');
    expect(prompt).toContain('- query (string, required): The title to search for');
    expect(prompt).toContain('How to use it: Search first, then read a page by id.');
    expect(prompt).not.toContain('connector:broken');
    expect(prompt).toContain('{"source":"connector:notion-1","message":"bad params"}');
    expect(prompt).toContain('"text":"tier: gold"');
  });

  it('rewrites an item only from evidence, and otherwise records that it was looked at', () => {
    const all = steps();
    const write = findStep(all, 'write');

    expect(write.condition).toBe('${{ variables.evidence.size > 0 }}');
    expect((write.steps ?? []).map(({ name }) => name)).toEqual([
      'rewrite',
      'apply',
      'tally_apply',
    ]);
    expect((write.else ?? []).map(({ name }) => name)).toEqual(['mark', 'tally_mark']);
    expect(findStep(all, 'apply').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      ki_id: '{{ foreach.item.id }}',
      expected_updated_at: '{{ foreach.item.updated_at }}',
      changes: '${{ steps.rewrite.output.content }}',
      evidence: '${{ variables.evidence }}',
      dry_run: '${{ inputs.dry_run == true }}',
    });
    expect(findStep(all, 'mark').with).toEqual(
      expect.objectContaining({
        changes: { changed: false },
        evidence: '${{ consts.no_items }}',
      })
    );
    expect(findStep(all, 'rewrite').with?.schema).toEqual(
      expect.objectContaining({ required: ['changed'] })
    );
  });

  it('adds up what each item came to', () => {
    const tally = findStep(steps(), 'tally_apply').with ?? {};
    const scope = {
      variables: { improved: 1, unchanged: 0, skipped: 2, would_write: [] },
      steps: {
        apply: {
          output: {
            tally: { improved: 1, unchanged: 0, skipped: 0 },
            would_write: [{ id: 'fact-1' }],
          },
        },
      },
    };

    expect(
      Object.fromEntries(Object.entries(tally).map(([key, value]) => [key, evaluate(value, scope)]))
    ).toEqual({ improved: 2, unchanged: 0, skipped: 2, would_write: [{ id: 'fact-1' }] });
  });

  it('outputs what it did, and a dry run ends cancelled with what it would write', () => {
    const all = steps();

    expect(findStep(all, 'output_result').with).toEqual({
      candidates: '${{ steps.candidates.output.candidates | size | default: 0 }}',
      selected: '${{ variables.selected | default: 0 }}',
      improved: '${{ variables.improved | default: 0 }}',
      unchanged: '${{ variables.unchanged | default: 0 }}',
      skipped: '${{ variables.skipped | default: 0 }}',
    });
    expect(findStep(all, 'dry_run_output')).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        with: expect.objectContaining({ would_write: '${{ variables.would_write }}' }),
      })
    );
  });
});
