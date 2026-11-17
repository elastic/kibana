/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { ContextEngineWikiWorkflowTemplateValues } from '.';
import { CONTEXT_ENGINE_WIKI_WORKFLOW, wikiMemberTypeQuery } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { convertToWorkflowGraph } from '../../../graph';

interface Step {
  name: string;
  type: string;
  condition?: string;
  status?: string;
  foreach?: string;
  'max-iterations'?: unknown;
  steps?: Step[];
  else?: Step[];
  with?: Record<string, unknown> & {
    query?: { bool?: { filter?: unknown[] } };
  };
}

const findStep = (steps: Step[], name: string): Step | undefined =>
  steps
    .map((step) =>
      step.name === name ? step : findStep([...(step.steps ?? []), ...(step.else ?? [])], name)
    )
    .find(Boolean);

const stepNamed = (steps: Step[], name: string): Step => {
  const step = findStep(steps, name);
  if (!step) {
    throw new Error(`No step named '${name}'`);
  }
  return step;
};

const values: ContextEngineWikiWorkflowTemplateValues = {
  aiIndexId: 'support-cases',
  instanceKey: 'support-cases-0123456789abcdef',
  memoriesIndex: 'ai-index-idx-support-cases',
  intervalMinutes: 120,
  connectorId: '',
  instructions: 'Support cases of "Acme".',
  factTypes: [{ type: 'preference' }],
  entityTypes: [{ type: 'customer' }],
  relationshipTypes: [],
  wiki: {
    instructions: 'One page per "customer".\nSkip {{ internal }} topics.',
    kiTypes: ['fact.*', 'entity.customer'],
    maxPages: 4,
    research: true,
  },
};

const render = (wiki: Partial<ContextEngineWikiWorkflowTemplateValues['wiki']> = {}) =>
  parse(
    CONTEXT_ENGINE_WIKI_WORKFLOW.yamlTemplate({ ...values, wiki: { ...values.wiki, ...wiki } })
  );
const steps = (): Step[] => render().steps;
const engine = createWorkflowLiquidEngine();
const evaluate = (expression: unknown, scope: Record<string, unknown>) =>
  engine.evalValueSync(String(expression).slice(3, -2).trim(), scope);
const renderTemplate = (template: unknown, scope: Record<string, unknown>): string =>
  String(engine.parseAndRenderSync(String(template), scope));

const audience = { kibana: { privileges: [{ space: 'default' }] } };
const otherAudience = {
  kibana: { privileges: [{ space: 'default', name: ['ai_index:a/read'], count: 1 }] },
};

describe('CONTEXT_ENGINE_WIKI_WORKFLOW', () => {
  it('is its own workflow on the dreaming schedule', () => {
    const workflow = render();

    expect(workflow.name).toBe('Wiki pages: support-cases');
    expect(workflow.settings.concurrency.key).toBe(
      'context-engine-wiki-support-cases-0123456789abcdef'
    );
    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '120m' } },
      expect.objectContaining({ type: 'manual' }),
    ]);
  });

  it('builds as an execution graph, as the workflow engine runs it', () => {
    expect(() => convertToWorkflowGraph(render())).not.toThrow();
  });

  it('writes the config into the consts exactly as given', () => {
    expect(render().consts).toEqual({
      ai_index_id: 'support-cases',
      memories_index: 'ai-index-idx-support-cases',
      connector_id: '',
      instructions: values.instructions,
      wiki_instructions: values.wiki.instructions,
      max_pages: 4,
      research: true,
      no_items: [],
    });
    expect(render({ research: false }).consts.research).toBe(false);
  });

  it('checks wiki pages are on before reading items or calling a model', () => {
    const all = steps();

    expect(all.map(({ name }) => name)).toEqual([
      'status',
      'paused',
      'last_run',
      'resume',
      'read_items',
      'active',
      'research_sources',
      'build',
      'dry_run_result',
      'output_result',
    ]);
    expect(all[0].with).toEqual({ ai_index_id: '{{ consts.ai_index_id }}', source: 'wiki' });
  });

  it('reads the changed items of the configured types, leaving out pages and relationships', () => {
    const [types] = (stepNamed(steps(), 'read_items').with?.query?.bool?.filter ?? []) as unknown[];

    expect(types).toEqual(wikiMemberTypeQuery(values.wiki.kiTypes));
    expect(types).toEqual({
      bool: {
        should: [{ prefix: { type: 'fact.' } }, { term: { type: 'entity.customer' } }],
        minimum_should_match: 1,
        must_not: [{ terms: { type: ['wiki.page', 'memory.relationship'] } }],
      },
    });
  });

  it('builds pages from the latest revisions that are neither deleted nor failed verification', () => {
    const latest = (id: string, status?: string) => ({
      inner_hits: {
        latest: {
          hits: {
            hits: [{ _source: { id, ...(status && { governance: { lifecycle: { status } } }) } }],
          },
        },
      },
    });

    expect(
      evaluate(stepNamed(steps(), 'active').with?.items, {
        execution: { startedAt: '2026-11-16T00:00:00.000Z' },
        steps: {
          read_items: {
            output: {
              hits: {
                hits: [latest('a'), latest('b', 'deleted'), latest('c', 'verification_failed')],
              },
            },
          },
        },
      })
    ).toEqual([{ id: 'a' }]);
  });

  it('lists the sources only when pages draw on them', () => {
    const condition = stepNamed(steps(), 'research_sources').condition;

    expect(evaluate(condition, { consts: { research: true }, variables: { items: [{}] } })).toBe(
      true
    );
    expect(evaluate(condition, { consts: { research: false }, variables: { items: [{}] } })).toBe(
      false
    );
  });

  it('plans pages for batches of items that share permissions', () => {
    const rendered = JSON.parse(
      renderTemplate(stepNamed(steps(), 'batches').foreach, {
        variables: {
          items: [
            ...Array.from({ length: 52 }, (_, i) => ({ id: `a-${i}`, permissions: audience })),
            { id: 'b', permissions: otherAudience },
          ],
        },
      })
    ) as unknown[][];

    expect(rendered.map((batch) => batch.length)).toEqual([50, 2, 1]);
  });

  it('shows the planning model the items and the existing pages of the same audience', () => {
    const prompt = renderTemplate(stepNamed(steps(), 'plan_pages').with?.prompt, {
      consts: render().consts,
      foreach: {
        item: [
          {
            id: 'fact-1',
            type: 'fact.preference',
            title: 'Acme likes email',
            content: 'x'.repeat(400),
            permissions: audience,
          },
        ],
      },
      steps: {
        read_pages: {
          output: {
            hits: {
              hits: [
                { _source: { id: 'wiki-acme', title: 'Acme', permissions: audience } },
                { _source: { id: 'wiki-secret', title: 'Secret', permissions: otherAudience } },
                {
                  _source: {
                    id: 'wiki-gone',
                    title: 'Gone',
                    permissions: audience,
                    governance: { lifecycle: { status: 'deleted' } },
                  },
                },
              ],
            },
          },
        },
      },
    });

    expect(prompt).toContain(`WHICH PAGES TO BUILD:\n\n${values.wiki.instructions}\n`);
    expect(prompt).toContain('Return at most 4 pages');
    expect(prompt).toContain('{"id":"wiki-acme","title":"Acme"}');
    expect(prompt).not.toContain('wiki-secret');
    expect(prompt).not.toContain('wiki-gone');
    const itemLine = prompt.split('\n').find((line) => line.includes('"fact-1"')) ?? '';
    expect(JSON.parse(itemLine)).toEqual({
      id: 'fact-1',
      type: 'fact.preference',
      title: 'Acme likes email',
      content: `${'x'.repeat(297)}...`,
    });
  });

  it('writes at most the configured number of pages in a run', () => {
    const all = steps();
    const pages = stepNamed(all, 'pages');

    expect(
      JSON.parse(
        renderTemplate(pages.foreach, {
          consts: { max_pages: 2 },
          steps: {
            plan_pages: {
              output: { content: { pages: [{ ref: 'a' }, { ref: 'b' }, { ref: 'c' }] } },
            },
          },
        })
      )
    ).toEqual([{ ref: 'a' }, { ref: 'b' }]);
    expect(stepNamed(all, 'page_budget').condition).toBe(
      '${{ variables.pages < consts.max_pages }}'
    );
  });

  it('gathers each page, researches it only when it can, then writes and applies it', () => {
    const all = steps();
    const hasMembers = stepNamed(all, 'has_members');

    expect(stepNamed(all, 'gather').with).toEqual({
      ai_index_id: '{{ consts.ai_index_id }}',
      page_ref: '{{ foreach.item.ref }}',
      seed_ids: '${{ foreach.item.seed_ids | default: consts.no_items }}',
      member_query: '{{ foreach.item.member_query | default: foreach.item.title }}',
    });
    expect(hasMembers.condition).toBe('${{ steps.gather.output.members.size > 0 }}');
    expect((hasMembers.steps ?? []).map(({ name }) => name)).toEqual([
      'start_page',
      'researchable',
      'write_page',
      'apply_page',
      'tally',
    ]);
    const researchable = stepNamed(all, 'researchable').condition;
    expect(
      evaluate(researchable, {
        consts: { research: true },
        steps: { sources: { output: { usable: 1 } } },
      })
    ).toBe(true);
    expect(evaluate(researchable, { consts: { research: true }, steps: {} })).toBe(false);
    expect(stepNamed(all, 'researchable').steps?.map(({ name }) => name)).toEqual([
      'research',
      'collect',
    ]);
    expect(stepNamed(all, 'research')).toEqual(
      expect.objectContaining({
        type: 'ai.agent',
        'agent-id': 'platform.context_engine.dreaming_research',
        ephemeral: true,
      })
    );
    expect(stepNamed(all, 'start_page').with).toEqual({
      pages: '${{ variables.pages | plus: 1 }}',
      evidence: '${{ consts.no_items }}',
    });
  });

  it('tells the research agent the page, its members and the searchable sources', () => {
    const prompt = renderTemplate(stepNamed(steps(), 'research').with?.message, {
      foreach: { item: { ref: 'new:1', title: 'Acme', description: 'The customer Acme.' } },
      steps: {
        gather: { output: { members: [{ id: 'fact-1', title: 'Acme likes email' }] } },
        sources: {
          output: {
            sources: [
              { ref: 'esql:1', type: 'esql', name: 'FROM crm', indices: ['crm'] },
              { ref: 'connector:x', type: 'connector', name: 'X', error: 'not read-only' },
            ],
          },
        },
      },
    });

    expect(prompt).toContain('PAGE: Acme: The customer Acme.');
    expect(prompt).toContain('- Acme likes email');
    expect(prompt).toContain('- ref: esql:1\n  Indices: crm');
    expect(prompt).not.toContain('connector:x');
  });

  it('applies the page to its existing id, or the key the plan gave a new one', () => {
    const apply = stepNamed(steps(), 'apply_page').with ?? {};
    const pageRef = (gathered: unknown) =>
      renderTemplate(apply.page_ref, {
        foreach: { item: { ref: 'new:1' } },
        steps: { gather: { output: gathered } },
      });

    expect(pageRef({ page: { id: 'wiki-acme' } })).toBe('wiki-acme');
    expect(pageRef({})).toBe('new:1');
    expect(apply.page).toBe('${{ steps.write_page.output.content }}');
    expect(apply.evidence).toBe('${{ variables.evidence }}');
  });

  it('shows the writing model the page, its members and the evidence', () => {
    const prompt = renderTemplate(stepNamed(steps(), 'write_page').with?.prompt, {
      consts: render().consts,
      foreach: { item: { ref: 'new:1', title: 'Acme', description: 'The customer Acme.' } },
      variables: { evidence: [{ id: 'e-1', text: 'Acme renewed in May.' }] },
      steps: {
        gather: {
          output: {
            members: [{ id: 'fact-1', type: 'fact.preference', title: 'Acme likes email' }],
          },
        },
      },
    });

    expect(prompt).toContain('PAGE: Acme: The customer Acme.');
    expect(prompt).toContain('{"id":"fact-1","type":"fact.preference","title":"Acme likes email"}');
    expect(prompt).toContain('{"id":"e-1","text":"Acme renewed in May."}');
    expect(prompt).toContain('[its title](ki://<its id>)');
  });

  it('adds up what each page came to and outputs where the read stopped', () => {
    const all = steps();
    const tally = stepNamed(all, 'tally').with ?? {};
    const scope = {
      variables: { created: 1, updated: 0, skipped: 0, would_write: [] },
      steps: {
        apply_page: {
          output: { tally: { created: 0, updated: 1, skipped: 0 }, would_write: [] },
        },
      },
    };

    expect(
      Object.fromEntries(Object.entries(tally).map(([key, value]) => [key, evaluate(value, scope)]))
    ).toEqual({ created: 1, updated: 1, skipped: 0, would_write: [] });
    expect(stepNamed(all, 'output_result').with).toEqual(
      expect.objectContaining({
        resume_from: '{{ variables.resume_from }}',
        resume_after_id: '{{ variables.resume_after_id }}',
      })
    );
  });
});
