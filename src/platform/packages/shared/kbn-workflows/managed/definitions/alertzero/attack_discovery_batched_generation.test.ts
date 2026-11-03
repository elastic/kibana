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
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_GENERATION_SOURCE,
} from '.';
import { getManagedWorkflowDefinition, managedWorkflowDefinitions } from '../..';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { convertToWorkflowGraph } from '../../../graph';
import type { WorkflowYaml } from '../../../spec/schema';

interface ParsedStep {
  name: string;
  type: string;
  'branch-timeout'?: string;
  concurrency?: number;
  foreach?: string;
  if?: string;
  mode?: string;
  'on-failure'?: { continue?: boolean };
  status?: string;
  steps?: ParsedStep[];
  timeout?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  enabled?: boolean;
  name?: string;
  outputs?: Array<{ name: string }>;
  settings?: { timeout?: string };
  steps?: ParsedStep[];
  triggers?: Array<{ type?: string; inputs?: { properties?: Record<string, unknown> } }>;
}

const parsed = parse(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW.yaml) as ParsedWorkflow;

const inputs = (): Record<string, Record<string, unknown>> =>
  (parsed.triggers?.find((trigger) => trigger.type === 'manual')?.inputs?.properties ??
    {}) as Record<string, Record<string, unknown>>;

const step = (name: string): ParsedStep => {
  const found = parsed.steps?.find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`No '${name}' step in the batched attack discovery workflow`);
  }
  return found;
};

describe('ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW', () => {
  it('uses the expected workflow id', () => {
    expect(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW.id).toBe(
      ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID
    );
  });

  it('is registered with the alertzero pluginId', () => {
    expect(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW.pluginId).toBe('alertzero');
  });

  it('is discoverable from the managed registry by id', () => {
    expect(
      getManagedWorkflowDefinition(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID)
    ).toBe(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW);
  });

  it('is a member of the managed registry', () => {
    expect(managedWorkflowDefinitions).toContain(
      ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW
    );
  });

  // A child with no trigger of its own must be enabled to be invokable at all;
  // disabling it only breaks `workflow.execute`. The opt-in gate is the AD
  // Worker, which ships disabled.
  it('is enabled so the parent can invoke it', () => {
    expect(parsed.enabled).toBe(true);
  });

  // With `restorable`, an upgrade keeps whatever `enabled` the installed
  // document already had, so a workflow installed while disabled could never be
  // re-enabled by a new version. `enforced` reapplies the value from the YAML.
  it('enforces its enablement rather than preserving the installed value', () => {
    expect(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW.management.enablement).toBe(
      'enforced'
    );
  });

  it('declares no trigger of its own, so only the parent can run it', () => {
    expect(parsed.triggers?.map(({ type }) => type)).toEqual(['manual']);
  });

  describe('inputs', () => {
    it('exposes exactly batch_size, connector_id, lookback and max_alerts', () => {
      expect(Object.keys(inputs()).sort()).toEqual([
        'batch_size',
        'connector_id',
        'lookback',
        'max_alerts',
      ]);
    });

    it('defaults max_alerts to a full day and keeps it inside one page of batches', () => {
      expect(inputs().max_alerts).toEqual(
        expect.objectContaining({ default: 10000, minimum: 100, maximum: 10000, type: 'integer' })
      );
    });

    it('defaults batch_size to 100', () => {
      expect(inputs().batch_size.default).toBe(100);
    });

    it('bounds batch_size between 50 and 1000', () => {
      expect({ max: inputs().batch_size.maximum, min: inputs().batch_size.minimum }).toEqual({
        max: 1000,
        min: 50,
      });
    });

    it('defaults lookback to 24h', () => {
      expect(inputs().lookback.default).toBe('24h');
    });

    // The only thing standing between this input and the ES|QL string.
    it('constrains lookback to a digits-plus-unit duration', () => {
      expect(inputs().lookback.pattern).toBe('^[0-9]+(ms|s|m|h|d|w)$');
    });

    it('does not require connector_id, so the server can resolve the default connector', () => {
      const manualTrigger = parsed.triggers?.find((trigger) => trigger.type === 'manual');

      expect((manualTrigger?.inputs as { required?: string[] })?.required).toBeUndefined();
    });
  });

  describe('retrieval', () => {
    const retrieve = () => step('retrieve_alert_ids');
    const query = () => String(retrieve().with?.query);

    it('retrieves ids only, leaving anonymization to each batch', () => {
      expect(retrieve().type).toBe('elasticsearch.esql.query');
      expect(query()).toMatch(/\| KEEP _id$/);
    });

    // The LIMIT cuts whatever sorts last, so the pre-LIMIT order decides which
    // alerts a capped run keeps: the highest-risk, newest must survive.
    it('sorts riskiest first, newest first among equals, before the LIMIT', () => {
      const riskSort = query().indexOf(
        '| SORT kibana.alert.risk_score DESC NULLS LAST, @timestamp DESC'
      );

      expect(riskSort).toBeGreaterThan(-1);
      expect(riskSort).toBeLessThan(query().indexOf('| LIMIT'));
    });

    // ES|QL sorts a null as the largest value, so a bare `DESC` would put every
    // unscored alert ahead of the scored ones.
    it('puts NULLS LAST directly after the risk_score direction', () => {
      expect(query()).toMatch(/\| SORT kibana\.alert\.risk_score DESC NULLS LAST, /);
    });

    // Risk only picks which alerts are kept. Batches are slices of the kept list,
    // so it has to be back in time order (newest first) after the cut.
    it('restores newest-first order after the LIMIT, so batches are contiguous time slices', () => {
      const limit = query().indexOf('| LIMIT');
      const timeSort = query().indexOf('| SORT @timestamp DESC\n');

      expect(limit).toBeGreaterThan(-1);
      expect(timeSort).toBeGreaterThan(limit);
      expect(timeSort).toBeLessThan(query().indexOf('| KEEP _id'));
      expect(query().match(/\| SORT /g)).toHaveLength(2);
    });

    it('retrieves only open and acknowledged alerts', () => {
      expect(query()).toContain('kibana.alert.workflow_status IN ("open", "acknowledged")');
    });

    // `!=` alone is null-valued, and so false, for an alert with no closing
    // reason — dropping the `IS NULL` arm would exclude every untriaged alert.
    it('excludes alerts closed as false positives without dropping untriaged ones', () => {
      expect(query()).toContain(
        'WHERE kibana.alert.workflow_reason IS NULL OR kibana.alert.workflow_reason != "false_positive"'
      );
    });

    it('keeps the false-positive clause in its own WHERE pipe', () => {
      const clauses = query()
        .split('|')
        .map((clause) => clause.trim())
        .filter((clause) => clause.startsWith('WHERE'));

      expect(clauses).toContain(
        'WHERE kibana.alert.workflow_reason IS NULL OR kibana.alert.workflow_reason != "false_positive"'
      );
    });

    // A true-positive or inconclusive review retires its alerts with
    // `az:ad_correlated`, and a false positive retires them with `az:ad_fp_chain`.
    // Correlating either again would only persist a near-duplicate attack.
    it('excludes alerts tagged az:ad_correlated or az:ad_fp_chain', () => {
      expect(retrieve().with?.filter).toEqual({
        bool: {
          must_not: [
            {
              terms: {
                'kibana.alert.workflow_tags': ['az:ad_correlated', 'az:ad_fp_chain'],
              },
            },
          ],
        },
      });
    });

    // A `must_not` keeps untagged alerts, which an ES|QL comparison on the
    // multi-valued, often-absent tag field would drop unless it had a null arm.
    it('excludes the tag in the pushed-down filter rather than the ES|QL query', () => {
      expect(query()).not.toContain('workflow_tags');
    });

    it('selects METADATA _id, which is all the batches need', () => {
      expect(query()).toContain('METADATA _id');
    });

    it('derives the LIMIT from the resolved alert cap', () => {
      expect(query()).toContain('| LIMIT {{ steps.resolve_alert_limit.output.alert_limit }}');
    });

    it('derives the cap from max_alerts and the 100-branch ceiling', () => {
      const template = String(step('resolve_alert_limit').with?.alert_limit);

      expect(template).toContain(
        '{%- assign branch_ceiling = inputs.batch_size | times: 100 | at_most: 10000 -%}'
      );
      expect(template).toContain(
        '{%- assign alert_limit = inputs.max_alerts | default: 10000 | at_most: branch_ceiling -%}'
      );
    });

    it('renders the prorated cap, and never more branches than the batch size allows', async () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });
      const limitOf = async (maxAlerts: number | undefined, batchSize: number) =>
        Number(
          await engine.parseAndRender(String(step('resolve_alert_limit').with?.alert_limit), {
            inputs: {
              batch_size: batchSize,
              ...(maxAlerts === undefined ? {} : { max_alerts: maxAlerts }),
            },
          })
        );

      expect(await limitOf(undefined, 100)).toBe(10000);
      expect(await limitOf(416, 100)).toBe(416);
      expect(await limitOf(100, 100)).toBe(100);
      expect(await limitOf(10000, 50)).toBe(5000);
    });

    describe('eligible count', () => {
      const count = () => step('count_eligible_alerts');
      const countQuery = () => String(count().with?.query);
      const whereClauses = (text: string) =>
        text
          .split('|')
          .map((clause) => clause.trim())
          .filter((clause) => clause.startsWith('WHERE'));

      // A count over a different window or population would report alerts that
      // were never eligible as over the cap.
      it('counts with the same WHERE pipes as the retrieval', () => {
        expect(whereClauses(countQuery())).toEqual(whereClauses(query()));
        expect(countQuery()).toContain('STATS eligible = COUNT(*)');
      });

      it('excludes the same already-reviewed tags as the retrieval', () => {
        expect(count().with?.filter).toEqual(retrieve().with?.filter);
      });

      it('does not sort or limit, so it counts every eligible alert', () => {
        expect(countQuery()).not.toMatch(/\| (SORT|LIMIT)/);
      });

      // A report must not fail the run: the batches' discoveries come after it.
      it('continues on failure', () => {
        expect(count()['on-failure']).toEqual({ continue: true });
      });

      it('runs after the retrieval it follows and before the fan-out', () => {
        const names = parsed.steps?.map(({ name }) => name) ?? [];

        expect(names.indexOf('count_eligible_alerts')).toBeGreaterThan(
          names.indexOf('retrieve_alert_ids')
        );
        expect(names.indexOf('count_eligible_alerts')).toBeLessThan(
          names.indexOf('generate_batches')
        );
      });

      describe('capped-run condition', () => {
        const engine = createWorkflowLiquidEngine({ strictFilters: true });

        const isCapped = async (rows: number, limit: number) =>
          (
            await engine.parseAndRender(String(step('resolve_cap').with?.capped), {
              steps: {
                resolve_alert_limit: { output: { alert_limit: String(limit) } },
                retrieve_alert_ids: {
                  output: { values: Array.from({ length: rows }, (_, i) => [`alert-${i}`]) },
                },
              },
            })
          ).trim();

        it('gates the count on the cap having been hit', () => {
          expect(count().if).toBe("${{ steps.resolve_cap.output.capped == 'true' }}");
        });

        it('is capped when exactly alert_limit rows came back', async () => {
          expect(await isCapped(500, 500)).toBe('true');
        });

        it('is not capped when fewer rows came back', async () => {
          expect(await isCapped(499, 500)).toBe('false');
          expect(await isCapped(0, 500)).toBe('false');
        });
      });
    });

    it('gives the child 12h so a slow scan can return to the runner', () => {
      expect(parsed.settings?.timeout).toBe('12h');
    });
  });

  describe('fan-out', () => {
    const fanOut = () => step('generate_batches');

    it('is a parallel step', () => {
      expect(fanOut().type).toBe('parallel');
    });

    it('settles every branch so one failed batch does not fail the run', () => {
      expect(fanOut().mode).toBe('settled');
    });

    // Fans out over batch offsets, not over the alert chunks themselves: a
    // chunk becomes the branch `key`, which the engine both persists in the
    // parallel step's branch state and copies into `results[].key`. At 100
    // anonymized alerts per batch that is ~300 KB duplicated twice per branch,
    // for a field used only for correlation.
    it('fans out over batch offsets rather than the alert payload', () => {
      const expr = String(fanOut().foreach);
      expect(expr).toContain('inputs.batch_size');
      expect(expr).not.toContain('chunk:');
    });

    // Matches the review fan-out width in the runner. Each branch here is a full
    // generation pipeline making inference calls, so this is the per-run
    // rate-limit exposure against the connector, not just a throughput lever.
    it('bounds concurrency, which is the per-run rate-limit exposure', () => {
      expect(fanOut().concurrency).toEqual({ max: 2 });
    });

    it('bounds each branch at 30m', () => {
      expect(fanOut()['branch-timeout']).toBe('30m');
    });

    // A step-level timeout inside a branch compiles to a timeout-zone node the
    // parallel executor cannot drive; graph-build rejects it outright.
    it('does not put a timeout on the branch step', () => {
      expect(fanOut().steps?.[0].timeout).toBeUndefined();
    });

    it('runs the full Attack Discovery pipeline per batch', () => {
      expect(fanOut().steps?.[0].type).toBe('security.attack-discovery.run');
    });

    it('has each batch retrieve its own alerts rather than take pre-built alert strings', () => {
      expect(fanOut().steps?.[0].with?.alert_retrieval_mode).toBe('esql');
      expect(fanOut().steps?.[0].with).not.toHaveProperty('alerts');
    });

    // The YAML cannot import the constant, so this is what keeps the two equal and
    // stops a deleted key from leaving the Worker deduplicating against manual runs.
    it('passes the Worker generation source to the run step', () => {
      expect(fanOut().steps?.[0].with?.generation_source).toBe(
        ALERTZERO_ATTACK_DISCOVERY_WORKER_GENERATION_SOURCE
      );
    });

    // The offsets and the per-branch slice are a matched pair — an off-by-one
    // in either silently drops or double-counts alerts — so they are evaluated
    // together against the engine rather than asserted as strings.
    describe('batch coverage', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });

      const getContext = (count: number, batchSize: number) => ({
        inputs: { batch_size: batchSize },
        steps: {
          // ES|QL returns each row as an array of its columns: `[_id]`.
          retrieve_alert_ids: {
            output: { values: Array.from({ length: count }, (_, i) => [`alert-${i}`]) },
          },
        },
        workflow: { spaceId: 'default' },
      });

      const renderQuery = (context: ReturnType<typeof getContext>, item: number) =>
        engine.parseAndRender(String(fanOut().steps?.[0].with?.esql_query), {
          ...context,
          foreach: { item },
        });

      // The ids a rendered query names, read from the `IN` list of the given field.
      const getInList = (query: string, field: string): string[] =>
        JSON.parse(`[${new RegExp(`WHERE ${field} IN \\(([^)]*)\\)`).exec(query)?.[1] ?? ''}]`);
      const getQueryIds = (query: string): string[] => getInList(query, '_id');

      const cover = async (count: number, batchSize: number) => {
        const context = getContext(count, batchSize);
        const offsets: number[] = JSON.parse(
          await engine.parseAndRender(String(fanOut().foreach), context)
        );
        const seen: string[] = [];
        for (const item of offsets) {
          seen.push(...getQueryIds(await renderQuery(context, item)));
        }
        return { offsets, seen };
      };

      it("renders each batch's query over exactly its slice of the ids", async () => {
        expect(await renderQuery(getContext(5, 2), 2)).toBe(
          [
            'FROM .alerts-security.alerts-default METADATA _id',
            '  | WHERE kibana.alert.uuid IN ("alert-2", "alert-3")',
            '  | WHERE _id IN ("alert-2", "alert-3")',
            '  | SORT @timestamp ASC',
            '  | LIMIT 2',
          ].join('\n')
        );
      });

      it('filters on the pushable kibana.alert.uuid with the same ids as _id', async () => {
        const query = await renderQuery(getContext(5, 2), 2);

        expect(getInList(query, 'kibana.alert.uuid')).toEqual(getQueryIds(query));
      });

      // The retrieval is newest first, so this is the order the model sees.
      it('sorts each batch by @timestamp before limiting it', async () => {
        const query = await renderQuery(getContext(5, 2), 0);

        expect(query.indexOf('| SORT @timestamp ASC')).toBeGreaterThan(-1);
        expect(query.indexOf('| SORT @timestamp ASC')).toBeLessThan(query.indexOf('| LIMIT'));
      });

      it('renders a short last batch with only the remaining ids', async () => {
        expect(getQueryIds(await renderQuery(getContext(5, 2), 4))).toEqual(['alert-4']);
      });

      it.each([
        [700, 100],
        [665, 100],
        [113, 100],
        [50, 50],
      ])('covers every one of %s alerts at batch_size %s', async (count, batchSize) => {
        const { offsets, seen } = await cover(count, batchSize);
        expect(seen).toEqual(Array.from({ length: count }, (_, i) => `alert-${i}`));
        expect(offsets).toHaveLength(Math.ceil(count / batchSize));
      });

      // `divided_by` is float division, so the naive `(total + size - 1) / size`
      // ceil emits one extra, empty batch on exact multiples — a wasted LLM run.
      it('emits no empty trailing batch on an exact multiple', async () => {
        const { offsets } = await cover(700, 100);
        expect(offsets).toEqual([0, 100, 200, 300, 400, 500, 600]);
      });

      it('fans out to nothing when no alerts were retrieved', async () => {
        const { offsets, seen } = await cover(0, 100);
        expect(offsets).toEqual([]);
        expect(seen).toEqual([]);
      });
    });

    // A branch output above the engine's eviction threshold is dropped from
    // in-memory state before the parallel step aggregates, so the discoveries
    // are read back from the index instead.
    it('opts out of inline discoveries so the branch output stays small', () => {
      expect(fanOut().steps?.[0].with?.include_attack_discoveries).toBe(false);
    });

    // The review's FP/TP analysis owns the false-positive decision. With the
    // gate on, generation dropped false-positive chains before any review ran.
    it('turns off the ground-truth gate on the run step', () => {
      expect(fanOut().steps?.[0].with?.ground_truth_gate_enabled).toBe(false);
    });

    // An unset cyber-domain row resolves to nothing, so the frontier tier stays
    // in charge. The order is the resolution order.
    it('tries the cyber-domain row before the frontier tier', () => {
      expect(fanOut().steps?.[0].with?.feature_id).toEqual([
        'alertzero_template_models',
        'alertzero_frontier',
      ]);
    });

    // Step IO is keyed by step id and returns the latest execution, so two
    // concurrent branches running the same step name would race.
    it('keeps the branch body to a single step', () => {
      expect(fanOut().steps).toHaveLength(1);
    });
  });

  describe('discovery retrieval', () => {
    const fetch = () => step('fetch_discoveries');

    it('reads the persisted discoveries back from the ad-hoc index', () => {
      expect({ index: fetch().with?.index, type: fetch().type }).toEqual({
        index: '.adhoc.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }}',
        type: 'elasticsearch.search',
      });
    });

    // Persistence writes only when the model produced attacks. A zero count must
    // not search an index that was never created.
    it('searches only when attacks were generated', () => {
      expect(fetch().if).toBe('${{ steps.aggregate.output.discoveries_generated > 0 }}');
    });

    // `ignore_unavailable` also hides an index the caller cannot read. Leaving it
    // unset makes that 403 fail the run instead of looking like a quiet run.
    it('fails the run when the search is not authorized', () => {
      expect(fetch().with?.ignore_unavailable).toBeUndefined();
    });

    // The run step's `execution_uuid` is written to each persisted document as
    // `kibana.alert.rule.execution.uuid`, so this scopes the query to exactly
    // this run — no time window, so concurrent runs cannot bleed into it.
    it("scopes the query to this run's generation uuids", () => {
      expect(fetch().with?.query).toEqual({
        terms: {
          'kibana.alert.rule.execution.uuid':
            "${{ steps.generate_batches.output.results | map: 'output' | map: 'execution_uuid' | compact }}",
        },
      });
    });

    it('raises size above the default of 10, which would silently truncate', () => {
      expect(fetch().with?.size).toBe(1000);
    });

    it('runs after the fan-out, so every batch has persisted and refreshed', () => {
      const names = parsed.steps?.map(({ name }) => name) ?? [];

      expect(names.indexOf('fetch_discoveries')).toBeGreaterThan(names.indexOf('generate_batches'));
    });

    it('runs after the generated count, which gates the search', () => {
      const names = parsed.steps?.map(({ name }) => name) ?? [];

      expect(names.indexOf('fetch_discoveries')).toBeGreaterThan(names.indexOf('aggregate'));
    });
  });

  describe('output', () => {
    it('emits the aggregate contract the parent reads', () => {
      expect(Object.keys(step('emit_result').with ?? {}).sort()).toEqual([
        'alerts_analyzed',
        'alerts_eligible',
        'alerts_over_cap',
        'attack_discoveries',
        'batch_errors',
        'batches_failed',
        'batches_succeeded',
        'batches_total',
        'discoveries_generated',
        'execution_uuids',
      ]);
    });

    // The pre-persist count the runner's telemetry reads.
    //
    // `attack_discoveries` is the read-back of what survived de-duplication, so this
    // is the only value that can disagree with it — and the AD Worker runner reports
    // the two as separate numbers.
    it('sums the generated count across batches rather than taking one batch', () => {
      expect(step('aggregate').with?.discoveries_generated).toContain(
        'for result in steps.generate_batches.output.results'
      );
    });

    it('sums the run step discovery_count, which survives include_attack_discoveries: false', () => {
      expect(step('aggregate').with?.discoveries_generated).toContain(
        'result.output.discovery_count'
      );
    });

    it('coerces the counted string back to a number', () => {
      expect(step('emit_result').with?.discoveries_generated).toBe(
        '${{ steps.aggregate.output.discoveries_generated | plus: 0 }}'
      );
    });

    describe('count_eligible_alerts', () => {
      const countStep = step('count_eligible_alerts');
      const engine = createWorkflowLiquidEngine({ strictFilters: true });

      // The step-level `if` becomes an `if_<step>` node wrapping the step, and
      // `on-failure: continue` wraps that in an `enterContinue_<step>` node.
      it('builds an if node and a continue wrapper in the execution graph', () => {
        const graph = convertToWorkflowGraph(
          parse(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW.yaml) as WorkflowYaml
        );

        expect(graph.hasNode('enterContinue_count_eligible_alerts')).toBe(true);
        expect(graph.hasNode('enterCondition_if_count_eligible_alerts')).toBe(true);
      });

      it.each([
        ['true', true],
        ['false', false],
      ])('evaluates its condition with capped=%s to %s', (capped, expected) => {
        expect(
          engine.evalValueSync(String(countStep.if).replace(/^\$\{\{|\}\}$/g, ''), {
            steps: { resolve_cap: { output: { capped } } },
          })
        ).toBe(expected);
      });
    });

    describe('alerts_over_cap', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });

      interface Scenario {
        // Rows `retrieve_alert_ids` returned; `limit` is the cap.
        retrieved: number;
        limit: number;
        // `undefined` models a skipped count step: no output at all.
        eligible?: number;
        // The engine stores a failed step as `output: null` (`step_io_service.ts`).
        countFailed?: boolean;
      }

      const context = ({ retrieved, limit, eligible, countFailed }: Scenario) => ({
        steps: {
          resolve_alert_limit: { output: { alert_limit: String(limit) } },
          resolve_cap: { output: { capped: retrieved >= limit ? 'true' : 'false' } },
          retrieve_alert_ids: {
            output: { values: Array.from({ length: retrieved }, (_, i) => [`alert-${i}`]) },
          },
          count_eligible_alerts: countFailed
            ? { output: null, error: { message: 'x' } }
            : { output: eligible === undefined ? undefined : { values: [[eligible]] } },
        },
      });

      const render = async (field: string, scenario: Scenario) =>
        (
          await engine.parseAndRender(String(step('aggregate').with?.[field]), context(scenario))
        ).trim();

      // Liquid evaluates the emit expressions against the rendered strings.
      const emit = (field: string, rendered: string) =>
        engine.evalValueSync(
          String(step('emit_result').with?.[field]).replace(/^\$\{\{|\}\}$/g, ''),
          {
            steps: { aggregate: { output: { [field]: rendered } } },
          }
        );

      it('reports the eligible alerts the cap left out of the run', async () => {
        expect(
          await render('alerts_over_cap', { eligible: 1300, limit: 500, retrieved: 500 })
        ).toBe('800');
      });

      it('reports zero when the cap was hit by exactly the eligible alerts', async () => {
        expect(await render('alerts_over_cap', { eligible: 500, limit: 500, retrieved: 500 })).toBe(
          '0'
        );
      });

      it('never goes negative when alerts close between the count and the retrieval', async () => {
        expect(await render('alerts_over_cap', { eligible: 490, limit: 500, retrieved: 500 })).toBe(
          '0'
        );
      });

      it('reports zero without a count when fewer alerts than the cap came back', async () => {
        expect(await render('alerts_over_cap', { limit: 500, retrieved: 120 })).toBe('0');
      });

      // Unknown is not zero: a capped run whose count failed must not look complete.
      it('reports null, not zero, when a capped run has no count', async () => {
        const rendered = await render('alerts_over_cap', { limit: 500, retrieved: 500 });

        expect(rendered).toBe('null');
        expect(emit('alerts_over_cap', rendered)).toBeNull();
      });

      it('reports null, not zero, when the count step failed on a capped run', async () => {
        const scenario = { countFailed: true, limit: 500, retrieved: 500 };

        const overCap = await render('alerts_over_cap', scenario);
        const eligible = await render('alerts_eligible', scenario);

        expect(overCap).toBe('null');
        expect(eligible).toBe('null');
        expect(emit('alerts_over_cap', overCap)).toBeNull();
        expect(emit('alerts_eligible', eligible)).toBeNull();
      });

      it('emits a counted over-cap value as a number', async () => {
        expect(emit('alerts_over_cap', '800')).toBe(800);
      });

      it('reports the eligible total from the count on a capped run', async () => {
        expect(
          await render('alerts_eligible', { eligible: 1300, limit: 500, retrieved: 500 })
        ).toBe('1300');
      });

      it('reports the retrieved rows as the eligible total on an uncapped run', async () => {
        expect(await render('alerts_eligible', { limit: 500, retrieved: 120 })).toBe('120');
      });

      it('reports the eligible total as null, not zero, when a capped run has no count', async () => {
        const rendered = await render('alerts_eligible', { limit: 500, retrieved: 500 });

        expect(rendered).toBe('null');
        expect(emit('alerts_eligible', rendered)).toBeNull();
      });
    });

    // A legacy array-typed output is validated as an array of scalars
    // (items anyOf string/number/boolean), so declaring one would reject the
    // arrays of discovery objects this workflow actually emits.
    it('declares no outputs block', () => {
      expect(parsed.outputs).toBeUndefined();
    });

    it('emits the persisted documents rather than the branch outputs', () => {
      expect(step('emit_result').with?.attack_discoveries).toBe(
        "${{ steps.fetch_discoveries.output.hits.hits | default: steps.aggregate.output.no_discoveries | map: '_source' }}"
      );
    });

    // Not the engine's own `failed` count: that scores a completed branch
    // carrying a pending run as a success.
    it('derives the failed count from the delivered count', () => {
      expect(step('emit_result').with?.batches_failed).toBe(
        '${{ steps.generate_batches.output.total | minus: steps.aggregate.output.delivered }}'
      );
    });

    // `results[].key` is the branch's entire batch of alerts, so the array must
    // never be emitted whole. `execution_uuids` does read `results`, but projects
    // a single scalar out of each entry -- hence checking for an UNPROJECTED
    // reference rather than any mention of `results` at all.
    it('never emits the raw branch results', () => {
      const unprojected = Object.values(step('emit_result').with ?? {})
        .map(String)
        .filter((value) => value.includes('output.results') && !value.includes('map:'));

      expect(unprojected).toEqual([]);
    });

    // 1:N with batching. Same expression `fetch_discoveries` queries by, so the
    // ids a caller is handed cannot drift from the ones the discoveries were
    // fetched with.
    it('emits one execution uuid per delivered batch', () => {
      expect(step('emit_result').with?.execution_uuids).toBe(
        "${{ steps.generate_batches.output.results | map: 'output' | map: 'execution_uuid' | compact }}"
      );
    });
  });

  // Evaluated against the engine's own Liquid configuration rather than
  // asserted as strings: these templates are the only logic in the workflow.
  describe('aggregation templates', () => {
    const engine = createWorkflowLiquidEngine({ strictFilters: true });

    const results = [
      {
        index: 0,
        output: { attack_discoveries: [{ id: 'a' }], status: 'completed' },
        status: 'completed',
      },
      { error: { message: 'rate limited' }, index: 1, status: 'failed' },
      { error: { message: 'branch 2 timed out' }, index: 2, status: 'timed_out' },
      {
        index: 3,
        output: { attack_discoveries: [{ id: 'b' }, { id: 'c' }], status: 'completed' },
        status: 'completed',
      },
      { index: 4, status: 'skipped' },
      // The branch completed, but the run returned before finishing. The
      // engine's own `succeeded` count scores this as a success.
      { index: 5, output: { execution_uuid: 'uuid-5', status: 'pending' }, status: 'completed' },
    ];

    const render = async (template: unknown) =>
      engine.parseAndRender(String(template), {
        steps: { generate_batches: { output: { results } } },
      });

    const templates = () => step('aggregate').with as Record<string, unknown>;

    it('reports every batch that did not deliver, not only the failed ones', async () => {
      expect(JSON.parse(await render(templates().errors_json))).toEqual([
        { batch_index: 1, message: 'rate limited', status: 'failed' },
        { batch_index: 2, message: 'branch 2 timed out', status: 'timed_out' },
        { batch_index: 4, message: 'no error message reported', status: 'skipped' },
        {
          batch_index: 5,
          message: 'run did not finish; returned execution_uuid uuid-5',
          status: 'pending',
        },
      ]);
    });

    // The run step returns `{ execution_uuid, status: 'pending' }` when it gives
    // up early, which the branch reports as a success. Counting it as delivered
    // would report a silent zero.
    it('counts a completed branch carrying a pending run as not delivered', async () => {
      expect((await render(templates().delivered)).trim()).toBe('2');
    });

    it('still counts a batch that found no attacks as delivered', async () => {
      const noAttacks = [
        { index: 0, output: { attack_discoveries: [], status: 'completed' }, status: 'completed' },
      ];
      const rendered = await engine.parseAndRender(String(templates().delivered), {
        steps: { generate_batches: { output: { results: noAttacks } } },
      });

      expect(rendered.trim()).toBe('1');
    });

    it('produces an empty error array when every batch succeeded', async () => {
      const allOk = [
        { index: 0, output: { attack_discoveries: [], status: 'completed' }, status: 'completed' },
      ];
      const rendered = await engine.parseAndRender(String(templates().errors_json), {
        steps: { generate_batches: { output: { results: allOk } } },
      });

      expect(JSON.parse(rendered)).toEqual([]);
    });
  });
});
