/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildScenarioModule } from './build_scenario_module';

const baseOptions = {
  fieldsType: 'ApmFields',
  clientVarName: 'apmEsClient',
  imports: [
    "import type { ApmFields } from '@kbn/synthtrace-client';",
    "import { apm } from '@kbn/synthtrace-client';",
  ],
  startMs: 1_700_000_000_000,
  endMs: 1_700_000_600_000,
  documentCount: 42,
  provenanceLines: [' * Captured the APM data.'],
  body: '      const rootEvents = [];',
};

describe('buildScenarioModule', () => {
  it('emits a runnable module anchored to an absolute start with a first-worker guard', () => {
    const code = buildScenarioModule(baseOptions);

    expect(code).toContain('const scenario: Scenario<ApmFields> = async ({ from }) => {');
    expect(code).toContain('clients: { apmEsClient }');
    expect(code).toContain(`const start = ${baseOptions.startMs};`);
    expect(code).not.toContain('range.to.getTime()');
    expect(code).toContain('const isFirstWorkerBucket = range.from.getTime() === from;');
    expect(code).toContain('function* generateCapturedEvents()');
    // Data-driven emission: a single `yield*` over the roots iterable, no per-event yields.
    expect(code).toContain('yield* rootEvents;');
    expect(code).toContain('const rootEvents = [];');
    expect(code).toContain("import { apm } from '@kbn/synthtrace-client';");
    expect(code).toContain(' * Captured the APM data.');
    expect(code).not.toContain('WARNING: the captured data spans');
  });

  it('supports a custom roots variable name', () => {
    const code = buildScenarioModule({ ...baseOptions, rootsVar: 'samples', body: '      const samples = [];' });
    expect(code).toContain('yield* samples;');
  });

  it('warns when many documents collapse onto a sub-second span', () => {
    const code = buildScenarioModule({
      ...baseOptions,
      startMs: 1_700_000_000_000,
      endMs: 1_700_000_000_000,
      documentCount: 12,
    });

    expect(code).toContain('WARNING: the captured data spans only 0ms across 12 documents');
  });
});
