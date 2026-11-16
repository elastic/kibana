/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ChangedFileReader } from './scout_implicit_consumers.ts';
import { expandWithImplicitConsumers } from './scout_implicit_consumers.ts';

const WORKFLOWS_EXTENSIONS_MODULE = '@kbn/workflows-extensions';

const createMockLog = (): ToolingLog =>
  ({ info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog);

/** Serves file contents from memory; files not listed are treated as deleted. */
const createFileReader = (files: Record<string, string>) =>
  jest.fn<ReturnType<ChangedFileReader>, Parameters<ChangedFileReader>>((file) => files[file]);

describe('expandWithImplicitConsumers — workflow trigger catalog', () => {
  it('adds workflows_extensions when a publisher changes common trigger schemas', () => {
    const log = createMockLog();
    const expanded = expandWithImplicitConsumers(
      new Set(['@kbn/cases-plugin']),
      ['x-pack/platform/plugins/shared/cases/common/workflows/triggers/index.ts'],
      log
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(true);
    expect(expanded.has('@kbn/cases-plugin')).toBe(true);
  });

  it('adds workflows_extensions for entity_store singular workflow/triggers layout', () => {
    const log = createMockLog();
    const expanded = expandWithImplicitConsumers(
      new Set(['@kbn/entity-store-plugin']),
      ['x-pack/platform/plugins/shared/entity_store/server/workflow/triggers/index.ts'],
      log
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(true);
  });

  it('adds workflows_extensions for alerting_v2 workflow_extensions registration', () => {
    const log = createMockLog();
    const expanded = expandWithImplicitConsumers(
      new Set(['@kbn/alerting-v2-plugin']),
      [
        'x-pack/platform/plugins/shared/alerting_v2/server/lib/workflow_extensions/register_trigger_definitions.ts',
      ],
      log
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(true);
  });

  it('does not add workflows_extensions for unrelated plugin changes', () => {
    const log = createMockLog();
    const file = 'x-pack/platform/plugins/shared/alerting_v2/server/routes/foo.ts';
    const expanded = expandWithImplicitConsumers(
      new Set(['@kbn/alerting-v2-plugin']),
      [file],
      log,
      createFileReader({ [file]: 'export const registerFooRoute = () => {};' })
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(false);
    expect(expanded.has('@kbn/alerting-v2-plugin')).toBe(true);
  });
});

describe('expandWithImplicitConsumers — workflow custom steps', () => {
  it.each([
    [
      'a common step definition',
      'x-pack/platform/plugins/shared/cases/common/workflows/steps/get_case.ts',
      'export const getCaseStepCommonDefinition: CommonStepDefinition<Input, Output> = {',
    ],
    [
      'a server step definition',
      'x-pack/platform/plugins/shared/cases/server/workflows/steps/get_case.ts',
      'export const getCaseStepDefinition = createServerStepDefinition({',
    ],
    [
      'a public step definition',
      'x-pack/platform/plugins/shared/cases/public/workflows/steps/get_case.ts',
      'export const getCaseStepDefinition = createPublicStepDefinition({',
    ],
    [
      'a step registration in a plugin setup',
      'x-pack/solutions/security/plugins/alertzero/server/plugin.ts',
      'workflowsExtensions.registerStepDefinition(loadAlertsStepDefinition);',
    ],
  ])('adds workflows_extensions when a change touches %s', (_, file, content) => {
    const expanded = expandWithImplicitConsumers(
      new Set(),
      [file],
      createMockLog(),
      createFileReader({ [file]: content })
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(true);
  });

  it('does not add workflows_extensions when a step file is deleted', () => {
    const expanded = expandWithImplicitConsumers(
      new Set(),
      ['x-pack/platform/plugins/shared/cases/server/workflows/steps/get_case.ts'],
      createMockLog(),
      createFileReader({})
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(false);
  });

  it('does not read files when workflows_extensions is already affected', () => {
    const file = 'x-pack/platform/plugins/shared/cases/server/workflows/steps/get_case.ts';
    const readFile = createFileReader({ [file]: 'createServerStepDefinition({' });

    const expanded = expandWithImplicitConsumers(
      new Set([WORKFLOWS_EXTENSIONS_MODULE]),
      [file],
      createMockLog(),
      readFile
    );

    expect(expanded).toEqual(new Set([WORKFLOWS_EXTENSIONS_MODULE]));
    expect(readFile).not.toHaveBeenCalled();
  });

  it('does not read Jest tests or non-source files', () => {
    const readFile = createFileReader({});

    expandWithImplicitConsumers(
      new Set(),
      [
        'x-pack/platform/plugins/shared/cases/server/workflows/steps/get_case.test.ts',
        'x-pack/platform/plugins/shared/cases/server/workflows/steps/README.md',
        'x-pack/platform/plugins/shared/cases/kibana.jsonc',
      ],
      createMockLog(),
      readFile
    );

    expect(readFile).not.toHaveBeenCalled();
  });
});

describe('expandWithImplicitConsumers — ignored files', () => {
  it('adds no consumers for a Jest-only change under an embeddables path', () => {
    const expanded = expandWithImplicitConsumers(
      new Set(),
      ['x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_charts.test.ts'],
      createMockLog()
    );

    expect(expanded).toEqual(new Set());
  });

  it('adds no consumers for a Jest-only change under a workflow triggers path', () => {
    const expanded = expandWithImplicitConsumers(
      new Set(),
      [
        'x-pack/platform/plugins/shared/alerting/common/workflows/triggers/alert_status_changed.test.ts',
      ],
      createMockLog()
    );

    expect(expanded).toEqual(new Set());
  });

  it('still adds consumers for a source change mixed with Jest-only changes', () => {
    const expanded = expandWithImplicitConsumers(
      new Set(),
      [
        'x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_charts.test.ts',
        'x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_charts.ts',
      ],
      createMockLog()
    );

    expect(expanded.has('@kbn/dashboard-plugin')).toBe(true);
  });
});
