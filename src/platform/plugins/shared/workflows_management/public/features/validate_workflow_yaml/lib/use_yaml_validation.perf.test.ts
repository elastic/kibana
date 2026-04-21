/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';
import YAML, { LineCounter } from 'yaml';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { collectAllCustomPropertyItems } from './collect_all_custom_property_items';
import { collectAllVariables } from './collect_all_variables';
import { validateConnectorIds } from './validate_connector_ids';
import { validateCustomProperties } from './validate_custom_properties';
import { validateIfConditions } from './validate_if_conditions';
import { validateJsonSchemaDefaults } from './validate_json_schema_defaults';
import { validateLiquidTemplate } from './validate_liquid_template';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';
import { validateTriggerConditions } from './validate_trigger_conditions';
import { validateVariables } from './validate_variables';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import { validateWorkflowOutputsInYaml } from './validate_workflow_outputs_in_yaml';
import { VARIABLE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import { getPropertyHandler } from '../../../../common/schema';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

const WARMUP_ITERATIONS = 5;

interface BenchmarkConfig {
  iterations: number;
  perStepThresholdMs: number;
  totalThresholdMs: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

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
  return median(samples);
}

function createMockModel(value: string) {
  const lines = value.split('\n');
  return {
    getValue: () => value,
    getPositionAt: (offset: number) => {
      let line = 1;
      let col = 1;
      for (let i = 0; i < offset && i < value.length; i++) {
        if (value[i] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      return { lineNumber: line, column: col };
    },
    getOffsetAt: (pos: { lineNumber: number; column: number }) => {
      let offset = 0;
      for (let i = 1; i < pos.lineNumber && offset < value.length; i++) {
        const nextNewline = value.indexOf('\n', offset);
        if (nextNewline === -1) {
          break;
        }
        offset = nextNewline + 1;
      }
      return offset + pos.column - 1;
    },
    getLineMaxColumn: (lineNumber: number) => {
      const line = lines[lineNumber - 1];
      return line ? line.length + 1 : 1;
    },
    uri: { path: '/test.yaml' },
  } as any;
}

function loadYaml(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8');
}

function runPerStepBenchmarks(yamlContent: string, config: BenchmarkConfig) {
  const lineCounter = new LineCounter();
  const yamlDocument = YAML.parseDocument(yamlContent, {
    lineCounter,
    keepSourceTokens: true,
  });
  const mockModel = createMockModel(yamlContent);
  const computed = performComputation(yamlContent);
  const { workflowDefinition, workflowGraph, workflowLookup } = computed;
  const { iterations, perStepThresholdMs } = config;

  const timings: Record<string, number> = {};

  timings.validateStepNameUniqueness = benchmarkSync(() => {
    validateStepNameUniqueness(yamlDocument, lineCounter);
  }, iterations);

  timings.validateLiquidTemplate = benchmarkSync(() => {
    validateLiquidTemplate(yamlContent, yamlDocument);
  }, iterations);

  timings.collectAllConnectorIds = benchmarkSync(() => {
    collectAllConnectorIds(yamlDocument, lineCounter);
  }, iterations);

  const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
  timings.validateConnectorIds = benchmarkSync(() => {
    validateConnectorIds(connectorIdItems, null, '');
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

    timings.collectAllCustomPropertyItems = benchmarkSync(() => {
      collectAllCustomPropertyItems(
        workflowLookup,
        lineCounter,
        (stepType: string, scope: 'config' | 'input', key: string) =>
          getPropertyHandler(stepType, scope, key)
      );
    }, iterations);
  }

  if (workflowGraph && workflowDefinition) {
    timings.collectAllVariables = benchmarkSync(() => {
      collectAllVariables(mockModel, yamlDocument, workflowGraph);
    }, iterations);

    const variableItems = collectAllVariables(mockModel, yamlDocument, workflowGraph);
    timings[`validateVariables (${variableItems.length} vars)`] = benchmarkSync(() => {
      validateVariables(variableItems, workflowGraph, workflowDefinition, yamlDocument, mockModel);
    }, iterations);

    timings.validateTriggerConditions = benchmarkSync(() => {
      validateTriggerConditions(workflowDefinition, yamlDocument);
    }, iterations);

    timings.validateJsonSchemaDefaults = benchmarkSync(() => {
      validateJsonSchemaDefaults(yamlDocument, workflowDefinition, mockModel);
    }, iterations);
  }

  return { timings, perStepThresholdMs };
}

async function runE2EBenchmark(yamlContent: string, config: BenchmarkConfig) {
  const { iterations, totalThresholdMs, perStepThresholdMs } = config;
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

    const model = createMockModel(yamlContent);

    start = performance.now();
    validateStepNameUniqueness(yamlDocument, lc);
    record('validateStepNameUniqueness', performance.now() - start);

    start = performance.now();
    validateLiquidTemplate(yamlContent, yamlDocument);
    record('validateLiquidTemplate', performance.now() - start);

    start = performance.now();
    const connectorIdItems = collectAllConnectorIds(yamlDocument, lc);
    validateConnectorIds(connectorIdItems, null, '');
    record('connectorIds (collect+validate)', performance.now() - start);

    start = performance.now();
    validateWorkflowOutputsInYaml(yamlDocument, model, workflowDefinition?.outputs);
    record('validateWorkflowOutputsInYaml', performance.now() - start);

    if (workflowLookup && lc) {
      start = performance.now();
      const customPropertyItems = collectAllCustomPropertyItems(
        workflowLookup,
        lc,
        (stepType: string, scope: 'config' | 'input', key: string) =>
          getPropertyHandler(stepType, scope, key)
      );
      record('collectAllCustomPropertyItems', performance.now() - start);

      start = performance.now();
      await validateCustomProperties(customPropertyItems);
      record('validateCustomProperties', performance.now() - start);

      start = performance.now();
      validateWorkflowInputs(workflowLookup, null, lc);
      record('validateWorkflowInputs', performance.now() - start);

      start = performance.now();
      validateIfConditions(workflowLookup, lc);
      record('validateIfConditions', performance.now() - start);
    }

    if (workflowGraph && workflowDefinition) {
      start = performance.now();
      const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);
      record('collectAllVariables', performance.now() - start);

      start = performance.now();
      validateVariables(variableItems, workflowGraph, workflowDefinition, yamlDocument, model);
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

  const medians: Record<string, number> = {};
  for (const [name, samples] of Object.entries(timings)) {
    medians[name] = Number(median(samples).toFixed(3));
  }

  return { medians, totalThresholdMs, perStepThresholdMs };
}

const EXAMPLES_DIR = '../../../../common/examples';

const SUITES = [
  {
    name: 'case_response.yaml (27 steps, 81 vars)',
    yamlPath: `${EXAMPLES_DIR}/case_response.yaml`,
    config: { iterations: 100, perStepThresholdMs: 50, totalThresholdMs: 100 },
  },
  {
    name: 'infosec_demo.yaml (150 steps, 361 vars)',
    yamlPath: `${EXAMPLES_DIR}/infosec_demo.yaml`,
    config: { iterations: 20, perStepThresholdMs: 500, totalThresholdMs: 2000 },
  },
] as const;

for (const suite of SUITES) {
  // FLAKY: https://github.com/elastic/kibana/issues/261389
  describe.skip(`YAML validation performance: ${suite.name}`, () => {
    let yamlContent: string;

    beforeAll(() => {
      yamlContent = loadYaml(suite.yamlPath);
    });

    it('each validation step completes within budget', async () => {
      const { timings, perStepThresholdMs } = runPerStepBenchmarks(yamlContent, suite.config);

      const varCount = Array.from(yamlContent.matchAll(VARIABLE_REGEX_GLOBAL)).length;
      const lineCount = yamlContent.split('\n').length;

      // eslint-disable-next-line no-console
      console.log(
        `\n--- Per-step (${lineCount} lines, ${varCount} vars, ` +
          `median of ${suite.config.iterations}, ms) ---`
      );
      // eslint-disable-next-line no-console
      console.table(
        Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
      );

      for (const [, ms] of Object.entries(timings)) {
        expect(ms).toBeLessThan(perStepThresholdMs);
      }
    });

    it('full validation pipeline completes within budget', async () => {
      const {
        medians,
        totalThresholdMs,
        perStepThresholdMs: stepThreshold,
      } = await runE2EBenchmark(yamlContent, suite.config);

      // eslint-disable-next-line no-console
      console.log(`\n--- E2E (median of ${suite.config.iterations}, ms) ---`);
      // eslint-disable-next-line no-console
      console.table(medians);

      expect(medians.total).toBeLessThan(totalThresholdMs);

      for (const [step, ms] of Object.entries(medians)) {
        if (step !== 'total') {
          expect(ms).toBeLessThan(stepThreshold);
        }
      }
    });
  });
}
