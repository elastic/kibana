/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Self-calibrated YAML validation performance suite.  Fixes #261389.
 *
 * HOW THE GATE WORKS
 * ------------------
 * Each step ceiling is expressed in "units" relative to a fixed CPU-bound calibration workload
 * measured in the same process at the start of every `beforeAll`:
 *
 *   ceiling = Math.max(units × calibrationMs × BUDGET_MULTIPLIER, FLOOR_MS)
 *
 * On an agent that is Kx slower than a developer machine the calibration is also Kx slower, so the
 * ceiling scales with it. A BUDGET_MULTIPLIER-× regression in the validation code is still caught
 * regardless of the agent's absolute speed.
 *
 * The gate uses min-of-N rather than median-of-N. Contention and GC pauses can only inflate a
 * sample, never deflate it. The minimum is therefore a better estimator of true cost and moves
 * only when every sample is perturbed — far more stable than the median under contention.
 *
 * HOW TO UPDATE UNITS
 * -------------------
 * Run on an idle machine:
 *
 *   node scripts/jest \
 *     src/platform/plugins/shared/workflows_management/public/features/validate_workflow_yaml/lib/use_yaml_validation.perf.test.ts
 *
 * Read the "derived units" column in the logged table, copy the values to SUITES[*].config.
 * Use 2 significant figures — rounding up is fine. Re-run 3× to confirm stability.
 */

const mockValidateQuery = jest.fn();

jest.mock('@kbn/esql-language', () => ({
  __esModule: true,
  validateQuery: (...args: unknown[]) => mockValidateQuery(...args),
  // @kbn/monaco's Console ES|QL lexer reads this eagerly at module-load time to build its
  // keyword list, so it needs a stub here even though this suite doesn't exercise highlighting.
  esqlCommandRegistry: { getAllCommandNames: () => [] },
}));

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';
import YAML, { LineCounter } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import {
  collectAllVariables,
  createStepContextResolver,
  validateVariables,
  VARIABLE_REGEX_GLOBAL,
} from '@kbn/workflows-yaml';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { collectAllStepPropertyItems } from './collect_all_step_property_items';
import { validateConnectorIds } from './validate_connector_ids';
import { validateIfConditions } from './validate_if_conditions';
import { validateJsonSchemaDefaults } from './validate_json_schema_defaults';
import { validateLiquidTemplate } from './validate_liquid_template';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';
import { validateStepProperties } from './validate_step_properties';
import { validateTriggerConditions } from './validate_trigger_conditions';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import { validateWorkflowOutputsInYaml } from './validate_workflow_outputs_in_yaml';
import { createMockWorkflowContextRegistry } from '../../../../common/lib/create_workflow_context_registry.mock';
import { createFakeMonacoModel } from '../../../../common/mocks/monaco_model';
import { getPropertyHandler } from '../../../../common/schema';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';
import { validateEsqlSteps } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps';

const emptyRegistry = createMockWorkflowContextRegistry();

const WARMUP_ITERATIONS = 5;

/** How many times more than the local minimum a step is allowed to take. */
const BUDGET_MULTIPLIER = 3;

/**
 * Absolute floor for any ceiling in ms. Steps that cost < 1ms locally are dominated by
 * `performance.now()` resolution noise; the floor prevents a large regression on a trivially
 * cheap step from sneaking through because FLOOR_MS > units × calibrationMs × BUDGET_MULTIPLIER.
 * For those steps the ci-stats trend (Layer 3 in the plan) catches regressions instead.
 */
const FLOOR_MS = 20;

const stubEsqlCallbacks: ESQLCallbacks = {};

// ─── Calibration ─────────────────────────────────────────────────────────────

/**
 * Fixed CPU-bound workload used to measure how fast this machine is *right now*. Intentionally
 * independent of the code under test: calibrating against the validators would let a regression
 * inflate its own budget and hide itself.
 *
 * The workload mixes Map operations, Math.sqrt, and string slicing to track the allocation and
 * property-access behaviour of the validators rather than raw ALU throughput.
 */
function calibrationWorkload(): void {
  const counts = new Map<string, number>();
  let tail = '';
  for (let i = 0; i < 20_000; i++) {
    const key = `k${i % 997}`;
    counts.set(key, (counts.get(key) ?? 0) + Math.sqrt(i));
    if (i % 100 === 0) tail = `${tail}${key}`.slice(-64);
  }
  // Prevent dead-code elimination.
  if (tail.length === 0 || counts.size === 0) throw new Error('dead-code-eliminated');
}

/** Returns the min-of-20 duration of {@link calibrationWorkload} after 5 warmup rounds. */
function measureCalibrationMs(): number {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    calibrationWorkload();
  }
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    calibrationWorkload();
    samples.push(performance.now() - start);
  }
  // 0.01ms floor: guards against division-by-zero in unit derivation on unusually fast machines.
  return Math.max(Math.min(...samples), 0.01);
}

// ─── Benchmark helpers ───────────────────────────────────────────────────────

interface BenchmarkConfig {
  iterations: number;
  /**
   * Total pipeline cost expressed in calibration units (ceiling = Math.max(totalUnits ×
   * calibrationMs × BUDGET_MULTIPLIER, FLOOR_MS)).  Asserted on the E2E benchmark's `.total`.
   */
  totalUnits: number;
  /** Per-step cost in calibration units for steps not listed in stepUnits. */
  defaultUnits: number;
  /** Per-step (or per-prefix) cost override in calibration units. */
  stepUnits?: Record<string, number>;
}

/** Returns min-of-N milliseconds for fn, after WARMUP_ITERATIONS warm-up calls. */
function benchmarkSync(fn: () => void, iterations: number): number {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return Math.min(...samples);
}

function resolveStepUnits(stepName: string, config: BenchmarkConfig): number {
  if (config.stepUnits?.[stepName] !== undefined) {
    return config.stepUnits[stepName];
  }
  for (const [prefix, units] of Object.entries(config.stepUnits ?? {})) {
    if (stepName.startsWith(prefix)) {
      return units;
    }
  }
  return config.defaultUnits;
}

/** Asserts that every step timing is within its calibrated ceiling. Returns any violations. */
function assertTimingsWithinBudget(
  timings: Record<string, number>,
  config: BenchmarkConfig,
  calibrationMs: number
): Array<{ step: string; ms: number; budgetMs: number }> {
  const violations: Array<{ step: string; ms: number; budgetMs: number }> = [];
  for (const [step, ms] of Object.entries(timings)) {
    if (step !== 'total') {
      const units = resolveStepUnits(step, config);
      const budgetMs = Math.max(units * calibrationMs * BUDGET_MULTIPLIER, FLOOR_MS);
      if (ms >= budgetMs) {
        violations.push({ step, ms, budgetMs });
      }
    }
  }
  return violations;
}

/**
 * Logs a timing table.  The "derived units" column shows what units should be set to for this
 * step: copy those values into SUITES[*].config.stepUnits after a local measurement run.
 */
function logTimingsTable(
  title: string,
  timings: Record<string, number>,
  calibrationMs: number,
  forceLog: boolean
) {
  if (!forceLog && process.env.CI) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(title);
  // eslint-disable-next-line no-console
  console.table(
    Object.fromEntries(
      Object.entries(timings).map(([k, v]) => [
        k,
        {
          'ms (min-of-N)': Number(v.toFixed(3)),
          'derived units': k === 'total' ? '—' : Number((v / calibrationMs).toFixed(2)),
        },
      ])
    )
  );
  // eslint-disable-next-line no-console
  console.log(`  calibration: ${calibrationMs.toFixed(4)} ms/unit`);
}

function loadYaml(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8');
}

/** Extends the shared fake model with APIs required by validateEsqlSteps. */
function createPerfMonacoModel(yamlContent: string) {
  return Object.assign(createFakeMonacoModel(yamlContent), {
    getValueLength: () => yamlContent.length,
  });
}

function runPerStepBenchmarks(yamlContent: string, config: BenchmarkConfig, calibrationMs: number) {
  const lineCounter = new LineCounter();
  const yamlDocument = YAML.parseDocument(yamlContent, {
    lineCounter,
    keepSourceTokens: true,
  });
  const mockModel = createPerfMonacoModel(yamlContent);
  const computed = performComputation(yamlContent);
  const { workflowDefinition, workflowGraph, workflowLookup } = computed;
  const { iterations } = config;

  const timings: Record<string, number> = {};

  timings.validateStepNameUniqueness = benchmarkSync(() => {
    validateStepNameUniqueness(yamlDocument, lineCounter);
  }, iterations);

  timings.validateLiquidTemplate = benchmarkSync(() => {
    validateLiquidTemplate(yamlContent, yamlDocument, lineCounter);
  }, iterations);

  timings.collectAllConnectorIds = benchmarkSync(() => {
    collectAllConnectorIds(yamlDocument, lineCounter);
  }, iterations);

  const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
  timings.validateConnectorIds = benchmarkSync(() => {
    validateConnectorIds(connectorIdItems, {}, '');
  }, iterations);

  timings.validateWorkflowOutputsInYaml = benchmarkSync(() => {
    validateWorkflowOutputsInYaml(yamlDocument, mockModel, undefined);
  }, iterations);

  if (workflowLookup) {
    timings.validateWorkflowInputs = benchmarkSync(() => {
      validateWorkflowInputs(workflowLookup, null, lineCounter);
    }, iterations);

    timings.validateIfConditions = benchmarkSync(() => {
      validateIfConditions(workflowLookup, lineCounter);
    }, iterations);

    timings.collectAllStepPropertyItems = benchmarkSync(() => {
      collectAllStepPropertyItems(workflowLookup, lineCounter, getPropertyHandler);
    }, iterations);
  }

  if (workflowGraph && workflowDefinition) {
    timings.collectAllVariables = benchmarkSync(() => {
      collectAllVariables(yamlContent, yamlDocument, lineCounter, workflowGraph);
    }, iterations);

    const variableItems = collectAllVariables(
      yamlContent,
      yamlDocument,
      lineCounter,
      workflowGraph
    );
    timings[`validateVariables (${variableItems.length} vars)`] = benchmarkSync(() => {
      validateVariables(
        createStepContextResolver(emptyRegistry, workflowDefinition, workflowGraph, yamlDocument),
        variableItems,
        workflowDefinition,
        yamlDocument,
        yamlContent
      );
    }, iterations);

    timings.validateTriggerConditions = benchmarkSync(() => {
      validateTriggerConditions(workflowDefinition, yamlDocument);
    }, iterations);

    timings.validateJsonSchemaDefaults = benchmarkSync(() => {
      validateJsonSchemaDefaults(yamlDocument, workflowDefinition, mockModel);
    }, iterations);
  }

  return { timings, config, calibrationMs };
}

async function runE2EBenchmark(
  yamlContent: string,
  config: BenchmarkConfig,
  calibrationMs: number
) {
  const { iterations } = config;
  const timings: Record<string, number[]> = {};
  const record = (name: string, ms: number) => {
    if (!timings[name]) {
      timings[name] = [];
    }
    timings[name].push(ms);
  };

  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    performComputation(yamlContent);
  }

  for (let i = 0; i < iterations; i++) {
    const totalStart = performance.now();

    let start = performance.now();
    const computed = performComputation(yamlContent);
    record('performComputation', performance.now() - start);

    const {
      yamlDocument,
      yamlLineCounter: lc,
      workflowDefinition,
      workflowGraph,
      workflowLookup,
    } = computed;

    if (!yamlDocument || !lc) {
      throw new Error(`performComputation returned no document on iteration ${i}`);
    }

    const model = createPerfMonacoModel(yamlContent);

    start = performance.now();
    validateStepNameUniqueness(yamlDocument, lc);
    record('validateStepNameUniqueness', performance.now() - start);

    start = performance.now();
    validateLiquidTemplate(yamlContent, yamlDocument, lc);
    record('validateLiquidTemplate', performance.now() - start);

    start = performance.now();
    const connectorIdItems = collectAllConnectorIds(yamlDocument, lc);
    validateConnectorIds(connectorIdItems, {}, '');
    record('connectorIds (collect+validate)', performance.now() - start);

    start = performance.now();
    validateWorkflowOutputsInYaml(yamlDocument, model, workflowDefinition?.outputs);
    record('validateWorkflowOutputsInYaml', performance.now() - start);

    if (workflowLookup && lc) {
      start = performance.now();
      const stepPropertyItems = collectAllStepPropertyItems(workflowLookup, lc, getPropertyHandler);
      record('collectAllStepPropertyItems', performance.now() - start);

      start = performance.now();
      await validateStepProperties(stepPropertyItems);
      record('validateStepProperties', performance.now() - start);

      start = performance.now();
      validateWorkflowInputs(workflowLookup, null, lc);
      record('validateWorkflowInputs', performance.now() - start);

      start = performance.now();
      validateIfConditions(workflowLookup, lc);
      record('validateIfConditions', performance.now() - start);

      start = performance.now();
      await validateEsqlSteps(workflowLookup, lc, model, stubEsqlCallbacks);
      record('validateEsqlSteps', performance.now() - start);
    }

    if (workflowGraph && workflowDefinition) {
      start = performance.now();
      const variableItems = collectAllVariables(yamlContent, yamlDocument, lc, workflowGraph);
      record('collectAllVariables', performance.now() - start);

      start = performance.now();
      validateVariables(
        createStepContextResolver(emptyRegistry, workflowDefinition, workflowGraph, yamlDocument),
        variableItems,
        workflowDefinition,
        yamlDocument,
        yamlContent
      );
      record('validateVariables', performance.now() - start);

      start = performance.now();
      validateTriggerConditions(workflowDefinition, yamlDocument);
      record('validateTriggerConditions', performance.now() - start);

      start = performance.now();
      validateJsonSchemaDefaults(yamlDocument, workflowDefinition, model);
      record('validateJsonSchemaDefaults', performance.now() - start);
    }

    record('total', performance.now() - totalStart);
  }

  // Use min-of-N for the gate; keep the full sample array for the timing table.
  const minimums: Record<string, number> = {};
  for (const [name, samples] of Object.entries(timings)) {
    minimums[name] = Number(Math.min(...samples).toFixed(3));
  }

  return { minimums, config, calibrationMs };
}

// ─── Suites ──────────────────────────────────────────────────────────────────

const EXAMPLES_DIR = '../../../../common/examples';

/**
 * Units derived on an Apple M-series Mac (September 2026). calibrationMs ≈ 2.6 ms/unit.
 * To re-derive: run this file locally on an idle machine, read the "derived units" column, and
 * update these values (2 sig. figs, round up).  Do NOT measure on a loaded machine.
 *
 * Per-step benchmark names vary by fixture size (e.g. "validateVariables (66 vars)"), so step keys
 * without a count are used here — they match both the per-step variant (via prefix) and the E2E
 * variant (exact match).
 */
const SUITES = [
  {
    name: 'case_response.yaml (27 steps, 66 vars)',
    yamlPath: `${EXAMPLES_DIR}/case_response.yaml`,
    config: {
      iterations: 100,
      // All per-step timings are < 0.1 units; FLOOR_MS=20 is the binding ceiling for each.
      defaultUnits: 0.1,
      // E2E total local min: 9.7ms → 3.7 units. ceiling = max(4.5 × calMs × 3, 20ms).
      totalUnits: 4.5,
      stepUnits: {
        // validateVariables (66 vars) per-step: 1.3ms → 0.49 units; E2E: 1.5ms → 0.57.
        // FLOOR_MS=20ms is binding; kept explicit to document the measured cost.
        validateVariables: 0.6,
        // performComputation appears in E2E only: 6.9ms → 2.7 units.
        performComputation: 3.0,
      },
    },
  },
  {
    name: 'infosec_demo.yaml (150 steps, 270 vars)',
    yamlPath: `${EXAMPLES_DIR}/infosec_demo.yaml`,
    config: {
      iterations: 20,
      // Most steps are < 0.25 units; FLOOR_MS=20ms is binding for all unlisted steps.
      defaultUnits: 0.25,
      // E2E total local min: 101.6ms → 39.5 units. ceiling = max(42 × calMs × 3, 20ms).
      totalUnits: 42,
      stepUnits: {
        // performComputation (E2E only): 24.7ms → 9.6 units.
        performComputation: 10,
        // validateLiquidTemplate per-step: 2.8ms → 1.09 units; E2E: 2.9ms → 1.13.
        // FLOOR_MS=20ms is binding (1.2 × calMs × 3 ≈ 9ms < 20ms).
        validateLiquidTemplate: 1.2,
        // collectAllVariables per-step: 1.0ms → 0.4 units; E2E: 2.2ms → 0.84.
        collectAllVariables: 0.9,
        // validateIfConditions per-step: 2.7ms → 1.04 units; E2E: 2.9ms → 1.14.
        // FLOOR_MS=20ms is binding.
        validateIfConditions: 1.2,
        // validateVariables was the step that failed on CI (#261389) at 507ms.
        // Per-step local min: 55.8ms → 21.7 units. E2E: 55.9ms → 21.7.
        // ceiling = max(22 × calMs × 3, 20ms). On 2.5× slower CI: ceiling ≈ 55.8ms × 7.5 ≈ 419ms.
        // Key without var count matches both "validateVariables (N vars)" (per-step, via prefix)
        // and "validateVariables" (E2E, exact).
        validateVariables: 22,
        // connectorIds (E2E combined step): 0.5ms → 0.2 units; FLOOR_MS=20ms binding.
        'connectorIds (collect+validate)': 0.25,
      },
    },
  },
] as const;

// ─── ci-stats reporting ───────────────────────────────────────────────────────

/**
 * Collected from all suites in afterAll; shipped to ci-stats as report-only metrics (no `limit`
 * field) so they are trended against the merge-base build but can never fail CI.
 *
 * On CI the Jest lane suppresses console.log, so this is the only way these numbers are visible
 * on a PR without opening the full job log.
 */
const allMinimums: Array<{
  suiteName: string;
  step: string;
  ms: number;
}> = [];

afterAll(async () => {
  if (!allMinimums.length) {
    return;
  }

  // Dynamic import keeps this optional: if the package fails to load for any reason,
  // swallow silently — a metrics outage must not turn a perf suite red.
  let reporter: import('@kbn/ci-stats-reporter').CiStatsReporter;
  try {
    const { CiStatsReporter } = await import('@kbn/ci-stats-reporter');
    // Minimal SomeDevLog — no @kbn/tooling-log dependency needed.
    const noopLog = {
      info: () => {},
      warning: () => {},
      error: () => {},
      success: () => {},
      debug: () => {},
      verbose: () => {},
    };
    reporter = CiStatsReporter.fromEnv(noopLog);
  } catch {
    return;
  }

  if (!reporter.hasBuildConfig()) {
    // No CI environment (local run or fork) — skip silently.
    return;
  }

  const CI_STATS_GROUP = 'workflow yaml validation';
  const metrics: Array<import('@kbn/ci-stats-reporter').CiStatsMetric> = [
    // Sentinel so ci-stats can distinguish "suite ran and reported nothing" from "suite was skipped".
    { group: CI_STATS_GROUP, id: '__ci_stats_captured__', value: 1 },
    ...allMinimums.map(({ suiteName, step, ms }) => ({
      group: CI_STATS_GROUP,
      // e.g. "case_response.yaml (27 steps, 66 vars)/validateVariables"
      // No `limit` field → stored, trended, diffed against merge-base; never fails CI.
      id: `${suiteName}/${step}`,
      value: Math.round(ms),
    })),
  ];

  // Race against a deadline shorter than Jest's default 5s hook timeout: req() retries
  // 5× with backoff (worst case ~400s) which would exceed the hook timeout and is not
  // catchable. 4s is generous for a single authenticated POST with ~20 numbers.
  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  await Promise.race([reporter.metrics(metrics).catch(() => {}), delay(4_000)]);
});

// ─── Test suites ─────────────────────────────────────────────────────────────

beforeEach(() => {
  mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
});

for (const suite of SUITES) {
  describe(`YAML validation performance: ${suite.name}`, () => {
    let yamlContent: string;
    let calibrationMs: number;

    beforeAll(() => {
      yamlContent = loadYaml(suite.yamlPath);
      calibrationMs = measureCalibrationMs();
    });

    // Explicit timeout: infosec_demo per-step runs ~2.4s locally on an M-series Mac.
    // CI agents run ~2.5× slower; the default 5s hook would be exceeded before any assertion fires.
    it('each validation step completes within budget', async () => {
      const { timings, config } = runPerStepBenchmarks(yamlContent, suite.config, calibrationMs);

      const varCount = Array.from(yamlContent.matchAll(VARIABLE_REGEX_GLOBAL)).length;
      const lineCount = yamlContent.split('\n').length;

      const violations = assertTimingsWithinBudget(timings, config, calibrationMs);
      // Log the table before asserting so it is visible on CI even when a step is over budget.
      logTimingsTable(
        `\n--- Per-step (${lineCount} lines, ${varCount} vars, min-of-${suite.config.iterations}, ms) ---`,
        timings,
        calibrationMs,
        violations.length > 0
      );
      for (const { ms, budgetMs } of violations) {
        expect(ms).toBeLessThan(budgetMs);
      }

      // Collect for afterAll ci-stats reporting.
      for (const [step, ms] of Object.entries(timings)) {
        if (step !== 'total') {
          allMinimums.push({ suiteName: suite.name, step, ms });
        }
      }
    }, 60_000);

    // Explicit timeout: infosec_demo E2E runs ~2.6s locally on an M-series Mac.
    // CI agents run ~2.5× slower; the default 5s hook would be exceeded before any assertion fires.
    it('full validation pipeline completes within budget', async () => {
      const { minimums, config } = await runE2EBenchmark(yamlContent, suite.config, calibrationMs);

      const totalBudgetMs = Math.max(
        config.totalUnits * calibrationMs * BUDGET_MULTIPLIER,
        FLOOR_MS
      );
      expect(minimums.total).toBeLessThan(totalBudgetMs);

      const violations = assertTimingsWithinBudget(minimums, config, calibrationMs);
      // Log the table before asserting so it is visible on CI even when a step is over budget.
      logTimingsTable(
        `\n--- E2E (min-of-${suite.config.iterations}, ms) ---`,
        minimums,
        calibrationMs,
        violations.length > 0
      );
      for (const { ms, budgetMs } of violations) {
        expect(ms).toBeLessThan(budgetMs);
      }

      // Collect for afterAll ci-stats reporting.
      for (const [step, ms] of Object.entries(minimums)) {
        allMinimums.push({ suiteName: `${suite.name}/e2e`, step, ms });
      }
    }, 60_000);
  });
}
