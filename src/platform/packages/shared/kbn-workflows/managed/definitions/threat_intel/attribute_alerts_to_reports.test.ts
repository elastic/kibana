/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

interface WorkflowStep {
  name?: string;
  type?: string;
  steps?: WorkflowStep[];
  with?: Record<string, unknown>;
}

const findStepByName = (
  steps: WorkflowStep[] | undefined,
  name: string
): WorkflowStep | undefined => {
  for (const step of steps ?? []) {
    if (step.name === name) return step;
    const nested = findStepByName(step.steps, name);
    if (nested) return nested;
  }
  return undefined;
};

/**
 * Mirrors `WorkflowTemplatingEngine.evaluateExpression`: drop the leading `$`,
 * then take everything between the first `{{` and the last `}}`.
 */
const evaluateExpression = (
  engine: ReturnType<typeof createWorkflowLiquidEngine>,
  template: string,
  context: Record<string, unknown>
): unknown => {
  const open = template.indexOf('{{');
  const close = template.lastIndexOf('}}');
  return engine.evalValueSync(template.substring(open + 2, close).trim(), context);
};

/**
 * Mirrors `WorkflowTemplatingEngine.renderValueRecursively`: `${{ ... }}` strings
 * are evaluated to typed values, plain strings are rendered, and objects and
 * arrays are walked.
 */
const renderValueRecursively = (
  engine: ReturnType<typeof createWorkflowLiquidEngine>,
  value: unknown,
  context: Record<string, unknown>
): unknown => {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.startsWith('${{') && value.endsWith('}}')
      ? evaluateExpression(engine, value.substring(1), context)
      : engine.parseAndRenderSync(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderValueRecursively(engine, item, context));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        renderValueRecursively(engine, item, context),
      ])
    );
  }

  return value;
};

describe('THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW yaml', () => {
  const workflow = parse(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW.yaml) as {
    enabled?: boolean;
    steps?: WorkflowStep[];
  };

  it('ships disabled so operators must enable in Workflows management', () => {
    expect(workflow.enabled).toBe(false);
  });

  it('scopes alert queries to the executing space', () => {
    expect(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW.yaml).toContain(
      '.alerts-security.alerts-{{ variables.spaceId }}'
    );
  });

  it('loads reports for the executing space plus the global catalog', () => {
    const loadStep = findStepByName(workflow.steps, 'load_reports_with_extractions');
    expect(loadStep).toBeDefined();
    const filter = JSON.stringify(loadStep?.with);
    // Space-keyed evidence is what makes including '*' safe: each space
    // writes its own nested element instead of clobbering a shared flat object.
    expect(filter).toContain('"space_id":["{{ variables.spaceId }}","*"]');
  });

  it('matches alert indicator references with a regexp in object form', () => {
    const step = findStepByName(workflow.steps, 'count_all_layer1_hits') as {
      with?: {
        query?: {
          bool?: {
            filter?: Array<{
              nested?: {
                path?: string;
                query?: { regexp?: Record<string, { value?: string }> };
              };
            }>;
          };
        };
      };
    };
    const nested = step.with?.query?.bool?.filter?.find(
      (clause) => clause.nested?.path === 'threat.enrichments'
    )?.nested;
    expect(nested?.query?.regexp?.['threat.enrichments.indicator.reference']?.value).toBe(
      "threat-report:({{ steps.load_reports_with_extractions.output.hits.hits | map: '_id' | join: '|' }})"
    );
  });

  // The scripted per-space upsert (evidence keying, alert_hits-only assignment) moved into
  // write_attribution_evidence.test.ts alongside the internal-user write it now requires --
  // `.kibana-threat-reports` is plugin-owned and hidden, so a plain `elasticsearch.update` step
  // here would run as whichever identity enabled this workflow and 403 for every non-superuser.

  it('writes via an internal route, not a direct elasticsearch step', () => {
    const writeStep = findStepByName(workflow.steps, 'write_evidence');
    expect(writeStep?.type).toBe('kibana.request');
    expect(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW.yaml).not.toContain('elasticsearch.bulk');
  });

  it('is space-addressed rather than an unconditional default-space call', () => {
    const writeStep = findStepByName(workflow.steps, 'write_evidence');
    expect(writeStep?.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/threat_intel/attribute_alerts_evidence'
    );
  });

  describe('write_evidence renders the attribution-evidence request', () => {
    const engine = createWorkflowLiquidEngine();
    const writeStep = findStepByName(workflow.steps, 'write_evidence');

    const context = {
      variables: {
        layer1_count: 3,
        layer2_count: 4,
        spaceId: 'space-a',
      },
      workflow: { spaceId: 'space-a' },
      foreach: { item: { _id: 'report-1', _index: '.kibana-threat-reports' } },
      now: '2024-06-01T00:00:00.000Z',
    };

    it('renders index, id, and the precomputed evidence fields', () => {
      expect(writeStep).toBeDefined();
      const rendered = renderValueRecursively(engine, writeStep?.with, context) as {
        method: string;
        path: string;
        body: {
          index: string;
          id: string;
          window: string;
          computedAt: string;
          iocMatchHits: number;
          techniqueOverlapHits: number;
          alertHitsTotal: number;
        };
      };

      expect(rendered.method).toBe('POST');
      expect(rendered.path).toBe('/s/space-a/internal/threat_intel/attribute_alerts_evidence');
      expect(rendered.body).toEqual({
        index: '.kibana-threat-reports',
        id: 'report-1',
        window: '7d',
        computedAt: '2024-06-01T00:00:00.000Z',
        iocMatchHits: 3,
        techniqueOverlapHits: 4,
        alertHitsTotal: 7,
      });
    });
  });

  describe('layer 2 technique matching', () => {
    const engine = createWorkflowLiquidEngine();
    const TECHNIQUE_FIELD = 'kibana.alert.rule.threat.technique.id';
    const SUBTECHNIQUE_FIELD = 'kibana.alert.rule.threat.technique.subtechnique.id';

    const backfillStep = findStepByName(workflow.steps, 'backfill_each_report');
    const captureStep = findStepByName(workflow.steps, 'capture_report_ref');
    const layer2Step = findStepByName(workflow.steps, 'layer2_search');
    const hitCountsStep = findStepByName(workflow.steps, 'capture_hit_counts');

    const lookup = (field: string) => ({
      terms: {
        [field]: {
          index: '.kibana-threat-reports',
          id: 'report-1',
          path: 'extracted.behaviors.technique_id',
        },
      },
    });

    const parentOnlyClause = (parent: string) => ({
      bool: {
        filter: [{ term: { [TECHNIQUE_FIELD]: parent } }],
        must_not: [{ prefix: { [SUBTECHNIQUE_FIELD]: `${parent}.` } }],
      },
    });

    const renderTechniqueClauses = (source: Record<string, unknown>): string => {
      const rendered = renderValueRecursively(engine, captureStep?.with, {
        foreach: { item: { _id: 'report-1', _index: '.kibana-threat-reports', _source: source } },
      }) as { technique_clauses: string };
      return rendered.technique_clauses;
    };

    const withBehaviors = (ids: string[]) => ({
      extracted: { behaviors: ids.map((technique_id) => ({ technique_id })) },
    });

    const lookups = [lookup(TECHNIQUE_FIELD), lookup(SUBTECHNIQUE_FIELD)];

    it.each([
      [
        'a mix of sub-techniques, parents, and blanks',
        withBehaviors(['T1059.004', 'T1059.001', 'T1566', '', 'T1003.001']),
        [...lookups, parentOnlyClause('T1059'), parentOnlyClause('T1003')],
      ],
      ['parent ids and blanks only', withBehaviors(['T1059', '']), lookups],
      ['no behaviors', withBehaviors([]), lookups],
      ['no extracted block', {}, lookups],
    ])('builds the technique clauses for %s', (_name, source, expected) => {
      expect(JSON.parse(renderTechniqueClauses(source))).toEqual(expected);
    });

    it('treats an id as data, so it cannot add a clause', () => {
      const parsed = JSON.parse(renderTechniqueClauses(withBehaviors(['T1"x.y'])));
      expect(parsed).toEqual([...lookups, parentOnlyClause('T1"x')]);
    });

    it('renders the query the layer 2 search sends', () => {
      const techniqueClauses = renderTechniqueClauses(
        withBehaviors(['T1059.004', 'T1059.001', 'T1566', '', 'T1003.001'])
      );
      const rendered = renderValueRecursively(engine, layer2Step?.with, {
        variables: { spaceId: 'space-a', technique_clauses: techniqueClauses },
        foreach: { item: { _id: 'report-1', _index: '.kibana-threat-reports' } },
      });

      expect(rendered).toEqual({
        index: '.alerts-security.alerts-space-a',
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-7d' } } },
              { term: { 'kibana.space_ids': 'space-a' } },
            ],
            must_not: [{ term: { 'kibana.alert.rule.type': 'threat_match' } }],
            should: [...lookups, parentOnlyClause('T1059'), parentOnlyClause('T1003')],
            minimum_should_match: 1,
          },
        },
      });
    });

    it('counts each report with a single search and reads its one total', () => {
      const searches = (backfillStep as WorkflowStep).steps?.filter(
        (step) => step.type === 'elasticsearch.search'
      );
      expect(searches?.map((step) => step.name)).toEqual(['layer2_search']);
      expect(hitCountsStep?.with?.layer2_count).toBe(
        '${{ steps.layer2_search.output.hits.total.value | default: 0 }}'
      );
    });
  });
});
