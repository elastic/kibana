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
  ensureSelectedTriggerTabVisible,
  getFallbackTriggerTab,
  getVisibleWorkflowTriggerTabs,
  getWorkflowCustomTriggerTypeIds,
  hasCustomEventTrigger,
  isDefaultTriggerEventSearchScope,
  omitUnchangedWorkflowInputDefaults,
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

describe('omitUnchangedWorkflowInputDefaults', () => {
  const inputsSchema = normalizeFieldsToJsonSchema({
    properties: {
      dynamicDefault: { type: 'string', default: '{{ consts.expected }}' },
      staticDefault: { type: 'string', default: 'blue' },
      tags: { type: 'array', items: { type: 'string' }, default: ['one', 'two'] },
      settings: {
        type: 'object',
        properties: {
          theme: { type: 'string', default: '{{ consts.theme }}' },
          locale: { type: 'string', default: 'en' },
        },
      },
      provided: { type: 'string' },
    },
  });

  it('omits unchanged defaults while retaining caller-provided values', () => {
    expect(
      omitUnchangedWorkflowInputDefaults(
        {
          dynamicDefault: '{{ consts.expected }}',
          staticDefault: 'blue',
          tags: ['one', 'two'],
          settings: {
            theme: '{{ consts.theme }}',
            locale: 'fr',
          },
          provided: '{{ literal.data }}',
        },
        inputsSchema
      )
    ).toEqual({
      settings: { locale: 'fr' },
      provided: '{{ literal.data }}',
    });
  });

  it('retains defaults that the caller changed', () => {
    expect(
      omitUnchangedWorkflowInputDefaults(
        {
          dynamicDefault: 'literal override',
          staticDefault: 'red',
          tags: ['three'],
        },
        inputsSchema
      )
    ).toEqual({
      dynamicDefault: 'literal override',
      staticDefault: 'red',
      tags: ['three'],
    });
  });
});

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

describe('isDefaultTriggerEventSearchScope', () => {
  it('returns true for the default workflow trigger scope query', () => {
    const defaultQuery = buildDefaultTriggerEventSearchQuery(['custom.trigger']);
    expect(isDefaultTriggerEventSearchScope(defaultQuery, ['custom.trigger'])).toBe(true);
  });

  it('returns false when the user changes the KQL query', () => {
    const defaultQuery = buildDefaultTriggerEventSearchQuery(['custom.trigger']);
    expect(
      isDefaultTriggerEventSearchScope({ ...defaultQuery, query: 'eventId: abc' }, [
        'custom.trigger',
      ])
    ).toBe(false);
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

describe('getVisibleWorkflowTriggerTabs', () => {
  it('returns all tabs when the workflow has no triggers', () => {
    expect(getVisibleWorkflowTriggerTabs(null)).toEqual([
      'alert',
      'index',
      'event',
      'manual',
      'historical',
    ]);
  });

  it('omits historical when previous executions are not available', () => {
    expect(getVisibleWorkflowTriggerTabs(null, { includeHistorical: false })).toEqual([
      'alert',
      'index',
      'event',
      'manual',
    ]);
  });

  it('returns alert, manual, and historical for alert-only workflows', () => {
    expect(
      getVisibleWorkflowTriggerTabs({ ...baseDefinition, triggers: [{ type: 'alert' }] })
    ).toEqual(['alert', 'manual', 'historical']);
  });

  it('returns document, manual, and historical for manual-only workflows', () => {
    expect(
      getVisibleWorkflowTriggerTabs({ ...baseDefinition, triggers: [{ type: 'manual' }] })
    ).toEqual(['index', 'manual', 'historical']);
  });

  it('returns event, manual, and historical for custom event-driven workflows', () => {
    expect(
      getVisibleWorkflowTriggerTabs(workflowWithExtensionTriggers([{ type: 'cases.created' }]))
    ).toEqual(['event', 'manual', 'historical']);
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

describe('ensureSelectedTriggerTabVisible', () => {
  const allEnabled = {
    hasAlertRacAccess: true,
    canReadWorkflowExecution: true,
    eventDrivenExecutionEnabled: true,
  };

  it('keeps the selected tab when it is visible and enabled', () => {
    expect(
      ensureSelectedTriggerTabVisible('manual', ['alert', 'manual', 'historical'], allEnabled)
    ).toBe('manual');
  });

  it('chooses the first visible enabled tab when the selected tab is not visible', () => {
    expect(
      ensureSelectedTriggerTabVisible('index', ['alert', 'manual', 'historical'], {
        ...allEnabled,
        hasAlertRacAccess: false,
      })
    ).toBe('manual');
  });

  it('skips event when execution read is denied', () => {
    expect(
      ensureSelectedTriggerTabVisible('index', ['event', 'manual', 'historical'], {
        ...allEnabled,
        canReadWorkflowExecution: false,
      })
    ).toBe('manual');
  });
});

describe('resolveInitialSelectedTrigger', () => {
  const customOnly = workflowWithExtensionTriggers([{ type: 'example.custom_trigger' }]);

  it('selects event when workflow has only custom triggers and execution read is allowed', () => {
    expect(resolveInitialSelectedTrigger(customOnly, undefined, true, true, undefined)).toBe(
      'event'
    );
  });

  it('falls back to manual when custom triggers exist but execution read is denied', () => {
    expect(resolveInitialSelectedTrigger(customOnly, undefined, true, false, undefined)).toBe(
      'manual'
    );
  });

  it('falls back to manual for alert-only workflows without RAC access', () => {
    expect(
      resolveInitialSelectedTrigger(
        { ...baseDefinition, triggers: [{ type: 'alert' }] },
        undefined,
        false,
        true,
        undefined
      )
    ).toBe('manual');
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
