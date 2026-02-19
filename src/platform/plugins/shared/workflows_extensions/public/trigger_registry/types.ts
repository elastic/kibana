/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { ConditionExample } from './condition_examples_schema';
import type { CommonTriggerDefinition } from '../../common';

/**
 * User-facing definition for a workflow trigger.
 * Used by the UI to display trigger information (title, description, icon, event schema, examples).
 * Extends the server contract (id + eventSchema) with UI-only fields.
 *
 * @example Valid definition with conditionExamples (event schema has severity and message)
 * {
 *   id: 'example.my_trigger',
 *   title: 'My Trigger',
 *   description: 'Fired when something happens.',
 *   eventSchema: z.object({ severity: z.string(), message: z.string() }),
 *   conditionExamples: [
 *     { title: 'High severity only', condition: 'event.severity: "high"' },
 *     { title: 'Any message', condition: 'event.message: *' },
 *   ],
 * }
 *
 * @example Invalid conditionExample (field not in event schema – will throw at registration)
 * conditionExamples: [{ title: 'Bad', condition: 'event.unknown: "x"' }]
 */
export interface PublicTriggerDefinition<EventSchema extends z.ZodType = z.ZodType>
  extends CommonTriggerDefinition<EventSchema> {
  /**
   * Short human-readable name for this trigger.
   * Displayed in the UI when selecting or viewing triggers.
   */
  title: string;

  /**
   * User-facing description of when this trigger is emitted.
   * Displayed as help text or in tooltips.
   */
  description: string;

  /**
   * Used to visually represent this trigger in the UI.
   */
  icon?: React.ComponentType;

  /**
   * KQL condition pre-filled in the trigger's `with.condition` when the user adds this
   * trigger from the UI (actions menu or YAML autocomplete).
   */
  defaultCondition?: string;

  /**
   * Example conditions for the `with` block.
   * Each condition must be valid KQL and only reference properties from the event schema (see validateKqlAgainstSchema).
   * Shown in the YAML editor hover to help users filter when the workflow runs.
   */
  conditionExamples?: ConditionExample[];
}
