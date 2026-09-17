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
} from '.';
import { getManagedWorkflowDefinition, managedWorkflowDefinitions } from '../..';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface ParsedStep {
  name: string;
  type: string;
  'branch-timeout'?: string;
  concurrency?: number;
  foreach?: string;
  mode?: string;
  status?: string;
  steps?: ParsedStep[];
  timeout?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  enabled?: boolean;
  name?: string;
  outputs?: Array<{ name: string }>;
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
    it('exposes exactly batch_size, connector_id and lookback', () => {
      expect(Object.keys(inputs()).sort()).toEqual(['batch_size', 'connector_id', 'lookback']);
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
    const retrieve = () => step('retrieve_alerts');

    it('uses the Attack Discovery retrieval step, which anonymizes the alerts', () => {
      expect(retrieve().type).toBe('security.attack-discovery.defaultAlertRetrieval');
    });

    it('sorts by @timestamp so batches are contiguous in time', () => {
      expect(retrieve().with?.esql_query).toContain('SORT @timestamp ASC');
    });

    it('retrieves only open and acknowledged alerts', () => {
      expect(retrieve().with?.esql_query).toContain(
        'kibana.alert.workflow_status IN ("open", "acknowledged")'
      );
    });

    // `!=` alone is null-valued, and so false, for an alert with no closing
    // reason — dropping the `IS NULL` arm would exclude every untriaged alert.
    it('excludes alerts closed as false positives without dropping untriaged ones', () => {
      expect(retrieve().with?.esql_query).toContain(
        'WHERE kibana.alert.workflow_reason IS NULL OR kibana.alert.workflow_reason != "false_positive"'
      );
    });

    it('keeps the false-positive clause in its own WHERE pipe', () => {
      const clauses = String(retrieve().with?.esql_query)
        .split('|')
        .map((clause) => clause.trim())
        .filter((clause) => clause.startsWith('WHERE'));

      expect(clauses).toContain(
        'WHERE kibana.alert.workflow_reason IS NULL OR kibana.alert.workflow_reason != "false_positive"'
      );
    });

    it('preserves METADATA _id, which the pipeline requires to resolve alerts', () => {
      expect(retrieve().with?.esql_query).toContain('METADATA _id');
    });

    it('derives the LIMIT from batch_size so the fan-out cap cannot be exceeded', () => {
      expect(retrieve().with?.esql_query).toContain(
        'LIMIT {{ inputs.batch_size | times: 100 | at_most: 10000 }}'
      );
    });

    // Required by DefaultAlertRetrievalInputSchema even though the ES|QL path
    // ignores it, so it is kept equal to the query's LIMIT.
    it('passes the required size, matching the derived LIMIT', () => {
      expect(retrieve().with?.size).toBe('${{ inputs.batch_size | times: 100 | at_most: 10000 }}');
    });

    it('lets the step fetch the space anonymization config by passing none', () => {
      expect(retrieve().with?.anonymization_fields).toEqual([]);
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

    // The offsets and the per-branch slice are a matched pair — an off-by-one
    // in either silently drops or double-counts alerts — so they are evaluated
    // together against the engine rather than asserted as strings.
    describe('batch coverage', () => {
      const engine = createWorkflowLiquidEngine({ strictFilters: true });

      const cover = async (count: number, batchSize: number) => {
        const context = {
          inputs: { batch_size: batchSize },
          steps: {
            retrieve_alerts: {
              output: { alerts: Array.from({ length: count }, (_, i) => `alert-${i}`) },
            },
          },
        };
        const offsets: number[] = JSON.parse(
          await engine.parseAndRender(String(fanOut().foreach), context)
        );
        // `${{ ... }}` returns a typed value at runtime; render it as JSON here
        // so the same expression can be evaluated through the string engine.
        const sliceExpr = String(fanOut().steps?.[0].with?.alerts)
          .replace(/^\$\{\{/, '{{')
          .replace(/\}\}$/, '| json }}');
        const seen: string[] = [];
        for (const item of offsets) {
          seen.push(
            ...JSON.parse(await engine.parseAndRender(sliceExpr, { ...context, foreach: { item } }))
          );
        }
        return { offsets, seen };
      };

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
  });

  describe('output', () => {
    it('emits the aggregate contract the parent reads', () => {
      expect(Object.keys(step('emit_result').with ?? {}).sort()).toEqual([
        'alerts_analyzed',
        'attack_discoveries',
        'batch_errors',
        'batches_failed',
        'batches_succeeded',
        'batches_total',
        'execution_uuids',
      ]);
    });

    // A legacy array-typed output is validated as an array of scalars
    // (items anyOf string/number/boolean), so declaring one would reject the
    // arrays of discovery objects this workflow actually emits.
    it('declares no outputs block', () => {
      expect(parsed.outputs).toBeUndefined();
    });

    it('emits the persisted documents rather than the branch outputs', () => {
      expect(step('emit_result').with?.attack_discoveries).toBe(
        "${{ steps.fetch_discoveries.output.hits.hits | map: '_source' }}"
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
