/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { THREAT_INTEL_INGEST_FEEDS_WORKFLOW } from '.';

const findStepByName = (steps: unknown[], name: string): Record<string, unknown> | undefined => {
  for (const step of steps) {
    const s = step as Record<string, unknown>;
    if (s.name === name) return s;
    for (const key of ['steps', 'else']) {
      const nested = s[key];
      if (Array.isArray(nested)) {
        const found = findStepByName(nested, name);
        if (found) return found;
      }
    }
  }
  return undefined;
};

/**
 * Static assertions over the shipped yaml. There is no execution harness in this package,
 * so these pin the structure the MVP source contract depends on rather than runtime
 * behaviour.
 */
describe('THREAT_INTEL_INGEST_FEEDS_WORKFLOW yaml', () => {
  const workflow = parse(THREAT_INTEL_INGEST_FEEDS_WORKFLOW.yaml) as { steps: unknown[] };

  // Load-bearing invariant: a disabled source must cause no fetch. The only source
  // enumeration the workflow does is `load_sources`, and every fetch runs inside the
  // foreach over its hits — so filtering `enabled: true` here is what keeps a disabled
  // AWS or FortiGuard pack from ever being requested. Enablement is per-document, so this
  // also means enabling one source never enables another.
  it('loads only enabled sources', () => {
    const step = findStepByName(workflow.steps, 'load_sources') as {
      with?: { query?: { bool?: { filter?: Array<Record<string, unknown>> } } };
    };
    const filters = step?.with?.query?.bool?.filter ?? [];

    const enabledFilter = filters.find(
      (f) => (f.term as { enabled?: { value?: unknown } } | undefined)?.enabled !== undefined
    );
    expect(enabledFilter).toBeDefined();
    expect((enabledFilter?.term as { enabled: { value: boolean } }).enabled.value).toBe(true);
  });

  it('fetches sources only from within the load_sources foreach', () => {
    // If a `fetch_source` step existed outside the enabled-filtered foreach, it could fetch
    // a source the filter excluded. It must live under `dispatch_each_source`.
    const topLevelFetch = (workflow.steps as Array<Record<string, unknown>>).find(
      (s) => s.type === 'threat_intel.fetch_source'
    );
    expect(topLevelFetch).toBeUndefined();

    const dispatch = findStepByName(workflow.steps, 'dispatch_each_source');
    expect(dispatch).toBeDefined();
    expect(findStepByName([dispatch as Record<string, unknown>], 'fetch_source')).toBeDefined();
  });
});
