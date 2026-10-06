/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { builtInTriggerDefinitions } from '@kbn/workflows';
import { commonWorkflowExecutionFailedTriggerDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
import {
  isTriggerDefinitionsLookupError,
  lookupTriggerDefinitionsForAgent,
} from './build_trigger_definitions_for_agent';

const mockCasesTrigger = {
  id: 'cases.caseUpdated',
  eventSchema: z.object({
    caseId: z.string(),
    owner: z.string(),
    updatedFields: z.array(z.string()).optional(),
  }),
  title: 'Cases - Case updated',
  description: 'Emitted when a case is updated.',
  documentation: {
    examples: [
      `triggers:
  - type: cases.caseUpdated
    on:
      condition: 'event.owner: "securitySolution"'`,
    ],
  },
};

describe('lookupTriggerDefinitionsForAgent', () => {
  it('returns built-in and registered trigger types without filter', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [mockCasesTrigger],
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    expect(result.count).toBe(builtInTriggerDefinitions.length + 1);
    expect(result.triggerTypes.map((t) => t.id)).toContain('cases.caseUpdated');
    expect(result.triggerTypes.map((t) => t.id)).toContain('manual');
  });

  it('returns jsonSchema and examples for built-in triggers', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [mockCasesTrigger],
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    const builtInTriggers = result.triggerTypes.filter((trigger) =>
      builtInTriggerDefinitions.some((def) => def.id === trigger.id)
    );
    for (const trigger of builtInTriggers) {
      expect(trigger.jsonSchema).toBeDefined();
      expect(trigger.examples?.length).toBeGreaterThan(0);
    }
  });

  it('returns custom trigger with trigger-specific eventContextSchema when filtered', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [mockCasesTrigger],
      triggerType: 'cases.caseUpdated',
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    expect(result.count).toBe(1);
    expect(result.triggerTypes[0].id).toBe('cases.caseUpdated');
    const schemaStr = JSON.stringify(result.triggerTypes[0].eventContextSchema);
    expect(schemaStr).toContain('caseId');
    expect(schemaStr).toContain('owner');
    expect(schemaStr).toContain('spaceId');
    expect(schemaStr).toContain('timestamp');
  });

  it('filters by built-in triggerType', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [mockCasesTrigger],
      triggerType: 'scheduled',
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    expect(result.count).toBe(1);
    expect(result.triggerTypes[0].id).toBe('scheduled');
  });

  it('returns error for unknown trigger type with built-in and registered availableTypes', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [mockCasesTrigger],
      triggerType: 'nonexistent',
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(true);
    if (!isTriggerDefinitionsLookupError(result)) {
      return;
    }

    expect(result.error).toContain('not found');
    expect(result.availableTypes).toContain('manual');
    expect(result.availableTypes).toContain('cases.caseUpdated');
  });

  it('uses documentation.examples from registered trigger definitions', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [commonWorkflowExecutionFailedTriggerDefinition],
      triggerType: 'workflows.failed',
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    const trigger = result.triggerTypes[0];
    expect(trigger.examples?.length).toBeGreaterThan(0);
    const examplesText = trigger.examples?.join('\n') ?? '';
    expect(examplesText).toContain('event.workflow');
    expect(examplesText).not.toContain('event.owner');
    expect(trigger.label).toBe('Workflow failed');
    expect(trigger.description).toContain('Emitted when any workflow');
  });

  it('omits examples when registered trigger has no documentation', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [
        {
          id: 'example.minimal',
          eventSchema: z.object({ value: z.string() }),
          title: 'Minimal trigger',
          description: 'Minimal trigger for testing.',
        },
      ],
      triggerType: 'example.minimal',
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    expect(result.triggerTypes[0].examples).toBeUndefined();
  });

  it('compacts large enums in scheduled trigger jsonSchema', () => {
    const result = lookupTriggerDefinitionsForAgent({
      registeredTriggers: [mockCasesTrigger],
      triggerType: 'scheduled',
    });

    expect(isTriggerDefinitionsLookupError(result)).toBe(false);
    if (isTriggerDefinitionsLookupError(result)) {
      return;
    }

    const schemaStr = JSON.stringify(result.triggerTypes[0].jsonSchema);
    expect(schemaStr).not.toContain('Pacific/Honolulu');
    expect(schemaStr).toContain('allowed values');
  });
});
