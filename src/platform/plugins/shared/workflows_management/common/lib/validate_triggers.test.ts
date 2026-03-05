/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { validateTriggerConditionsForWorkflow, validateTriggers } from './validate_triggers';

const CUSTOM_TRIGGER_TYPE = 'my.custom.trigger';

const eventSchema = z.object({
  severity: z.string(),
  message: z.string(),
});

const getTriggerDefinition = (triggerType: string) =>
  triggerType === CUSTOM_TRIGGER_TYPE ? { eventSchema } : undefined;

const MINIMAL_STEPS: WorkflowYaml['steps'] = [
  { name: 'step1', type: 'wait', with: { duration: '5s' } },
];

/** Builds a minimal valid WorkflowYaml. Triggers are cast so custom trigger types can be passed in tests. */
function minimalWorkflow(
  triggers: Array<{ type: string; with?: { condition?: string } }>
): WorkflowYaml {
  return {
    version: '1',
    name: 'test',
    enabled: true,
    steps: MINIMAL_STEPS,
    triggers: triggers as WorkflowYaml['triggers'],
  };
}

describe('validateTriggerConditionsForWorkflow', () => {
  it('trigger with valid condition passes', () => {
    const workflow = minimalWorkflow([
      { type: CUSTOM_TRIGGER_TYPE, with: { condition: 'event.severity: "high"' } },
    ]);

    const result = validateTriggerConditionsForWorkflow(workflow, getTriggerDefinition);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('trigger with invalid KQL fails', () => {
    const workflow = minimalWorkflow([
      { type: CUSTOM_TRIGGER_TYPE, with: { condition: 'invalid ( unclosed' } },
    ]);

    const result = validateTriggerConditionsForWorkflow(workflow, getTriggerDefinition);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ triggerIndex: 0 });
    expect(result.errors[0].message).toBeDefined();
    expect(typeof result.errors[0].message).toBe('string');
  });

  it('trigger with unknown field fails', () => {
    const workflow = minimalWorkflow([
      { type: CUSTOM_TRIGGER_TYPE, with: { condition: 'event.unknown: "x"' } },
    ]);

    const result = validateTriggerConditionsForWorkflow(workflow, getTriggerDefinition);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ triggerIndex: 0 });
    expect(result.errors[0].message).toContain('event.unknown');
  });

  it('built-in triggers are skipped', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'test',
      enabled: true,
      steps: MINIMAL_STEPS,
      triggers: [{ type: 'alert', with: { rule_id: 'r1' } }],
    };

    const result = validateTriggerConditionsForWorkflow(workflow, getTriggerDefinition);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('trigger without condition is valid', () => {
    const workflow = minimalWorkflow([
      { type: CUSTOM_TRIGGER_TYPE },
      { type: CUSTOM_TRIGGER_TYPE, with: {} },
      { type: CUSTOM_TRIGGER_TYPE, with: { condition: '' } },
    ]);

    const result = validateTriggerConditionsForWorkflow(workflow, getTriggerDefinition);

    expect(result).toEqual({ valid: true, errors: [] });
  });
});

describe('validateTriggers', () => {
  it('delegates to validateTriggerConditionsForWorkflow with definition lookup', () => {
    const workflow = minimalWorkflow([
      { type: CUSTOM_TRIGGER_TYPE, with: { condition: 'event.severity: "high"' } },
    ]);
    const triggerDefinitions = [{ id: CUSTOM_TRIGGER_TYPE, eventSchema }];

    const result = validateTriggers(workflow, triggerDefinitions);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('returns validation errors when condition is invalid', () => {
    const workflow = minimalWorkflow([
      { type: CUSTOM_TRIGGER_TYPE, with: { condition: 'event.unknown: "x"' } },
    ]);
    const triggerDefinitions = [{ id: CUSTOM_TRIGGER_TYPE, eventSchema }];

    const result = validateTriggers(workflow, triggerDefinitions);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].triggerIndex).toBe(0);
  });
});
