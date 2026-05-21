/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import type { NormalizedWorkflowInputs } from './workflow_execute_modal_helpers';
import {
  buildDefaultTriggerEventSearchQuery,
  buildWorkflowTriggerScopeKql,
  getFallbackTriggerTab,
  getWorkflowCustomTriggerTypeIds,
  hasCustomEventTrigger,
  resolveInitialSelectedTrigger,
} from './workflow_execute_modal_helpers';

const baseDefinition = {
  version: '1',
  name: 'wf',
  enabled: true,
  triggers: [],
  steps: [],
} as WorkflowYaml;

/**
 * Extension trigger IDs (e.g. `cases.created`) are valid at runtime but omitted from the strict
 * `WorkflowYaml` trigger union used for authoring defaults.
 */
function workflowWithExtensionTriggers(
  triggers: ReadonlyArray<{ type: string } & Record<string, unknown>>
): WorkflowYaml {
  return {
    ...baseDefinition,
    triggers: triggers as WorkflowYaml['triggers'],
  };
}

describe('hasCustomEventTrigger', () => {
  it('returns false when definition is null', () => {
    expect(hasCustomEventTrigger(null)).toBe(false);
  });

  it('returns false when triggers are empty', () => {
    expect(hasCustomEventTrigger({ ...baseDefinition, triggers: [] })).toBe(false);
  });

  it('returns false when only built-in triggers are present', () => {
    expect(
      hasCustomEventTrigger({
        ...baseDefinition,
        triggers: [
          { type: 'alert' },
          { type: 'manual' },
          { type: 'scheduled', with: { every: '1h' } },
        ],
      })
    ).toBe(false);
  });

  it('returns true when a registered custom trigger id is present', () => {
    expect(hasCustomEventTrigger(workflowWithExtensionTriggers([{ type: 'cases.created' }]))).toBe(
      true
    );
  });
});

describe('getWorkflowCustomTriggerTypeIds', () => {
  it('returns extension trigger type strings', () => {
    expect(
      getWorkflowCustomTriggerTypeIds(
        workflowWithExtensionTriggers([{ type: 'cases.created' }, { type: 'alert' }])
      )
    ).toEqual(['cases.created']);
  });

  it('returns every distinct custom trigger id when multiple are defined', () => {
    expect(
      getWorkflowCustomTriggerTypeIds(
        workflowWithExtensionTriggers([
          { type: 'workflow.execution.failed' },
          { type: 'cases.created' },
        ])
      )
    ).toEqual(['workflow.execution.failed', 'cases.created']);
  });

  it('deduplicates the same custom trigger type if listed more than once', () => {
    expect(
      getWorkflowCustomTriggerTypeIds(
        workflowWithExtensionTriggers([{ type: 'cases.created' }, { type: 'cases.created' }])
      )
    ).toEqual(['cases.created']);
  });

  it('returns empty when no extension triggers', () => {
    expect(
      getWorkflowCustomTriggerTypeIds({
        ...baseDefinition,
        triggers: [{ type: 'manual' }, { type: 'scheduled', with: { every: '1h' } }],
      })
    ).toEqual([]);
  });
});

describe('buildWorkflowTriggerScopeKql', () => {
  it('returns undefined when there are no trigger ids', () => {
    expect(buildWorkflowTriggerScopeKql([])).toBeUndefined();
  });

  it('quotes a single custom trigger id', () => {
    expect(buildWorkflowTriggerScopeKql(['custom.trigger'])).toBe('triggerId: "custom.trigger"');
  });

  it('builds an OR clause for multiple trigger ids', () => {
    expect(buildWorkflowTriggerScopeKql(['workflow.execution.failed', 'cases.created'])).toBe(
      'triggerId: ("workflow.execution.failed" or "cases.created")'
    );
  });
});

describe('buildDefaultTriggerEventSearchQuery', () => {
  it('seeds the KQL bar with workflow trigger scope', () => {
    expect(buildDefaultTriggerEventSearchQuery(['custom.trigger'])).toEqual({
      query: 'triggerId: "custom.trigger"',
      language: 'kuery',
    });
  });

  it('uses an empty query when the workflow has no custom triggers', () => {
    expect(buildDefaultTriggerEventSearchQuery([])).toEqual({
      query: '',
      language: 'kuery',
    });
  });
});

describe('getFallbackTriggerTab', () => {
  const normalizedWithOneField: NormalizedWorkflowInputs = normalizeFieldsToJsonSchema([
    { name: 'x', type: 'string', required: true },
  ]);

  it('returns manual when workflow inputs define fields', () => {
    expect(getFallbackTriggerTab(normalizedWithOneField, null, true)).toBe('manual');
  });

  it('returns event when no manual inputs, readExecution allowed, and custom trigger exists', () => {
    const def = workflowWithExtensionTriggers([{ type: 'cases.created' }]);
    expect(getFallbackTriggerTab(undefined, def, true)).toBe('event');
  });

  it('returns index when readExecution is denied even with custom trigger', () => {
    const def = workflowWithExtensionTriggers([{ type: 'cases.created' }]);
    expect(getFallbackTriggerTab(undefined, def, false)).toBe('index');
  });

  it('returns index when no custom trigger and no manual inputs', () => {
    expect(
      getFallbackTriggerTab(undefined, { ...baseDefinition, triggers: [{ type: 'alert' }] }, true)
    ).toBe('index');
  });
});

describe('resolveInitialSelectedTrigger', () => {
  const customOnly = workflowWithExtensionTriggers([{ type: 'example.custom_trigger' }]);

  it('selects event when workflow has only custom triggers and execution read is allowed', () => {
    expect(resolveInitialSelectedTrigger(customOnly, undefined, true, true, undefined)).toBe(
      'event'
    );
  });

  it('falls back when custom triggers exist but execution read is denied', () => {
    expect(resolveInitialSelectedTrigger(customOnly, undefined, true, false, undefined)).toBe(
      'index'
    );
  });

  it('prefers alert when an alert trigger exists alongside custom triggers', () => {
    const def = workflowWithExtensionTriggers([{ type: 'alert' }, { type: 'cases.created' }]);
    expect(resolveInitialSelectedTrigger(def, undefined, true, true, undefined)).toBe('alert');
  });

  it('selects historical when initialExecutionId is set and read is allowed', () => {
    expect(resolveInitialSelectedTrigger(customOnly, 'exec-1', true, true, undefined)).toBe(
      'historical'
    );
  });
});
