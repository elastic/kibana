/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { expandWithImplicitConsumers } from './scout_implicit_consumers';

const WORKFLOWS_EXTENSIONS_MODULE = '@kbn/workflows-extensions';

const createMockLog = (): ToolingLog =>
  ({ info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog);

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
    const expanded = expandWithImplicitConsumers(
      new Set(['@kbn/alerting-v2-plugin']),
      ['x-pack/platform/plugins/shared/alerting_v2/server/routes/foo.ts'],
      log
    );

    expect(expanded.has(WORKFLOWS_EXTENSIONS_MODULE)).toBe(false);
    expect(expanded.has('@kbn/alerting-v2-plugin')).toBe(true);
  });
});
