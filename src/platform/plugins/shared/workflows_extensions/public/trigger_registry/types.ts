/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../../common';

/**
 * Documentation for a trigger (aligned with steps: details + generic examples).
 */
export interface TriggerDocumentation {
  /**
   * Detailed description with usage examples (markdown supported)
   */
  details?: string;
  /**
   * Usage examples as markdown strings (e.g. "## Title\n```yaml\n...").
   * Shown in the YAML editor hover.
   */
  examples?: string[];
}

/**
 * Pre-filled snippet values when the user adds this trigger from the UI.
 */
export interface TriggerSnippets {
  /**
   * KQL condition pre-filled in the trigger's `with.condition` when the user adds this
   * trigger from the UI (actions menu or YAML autocomplete).
   * Must be valid KQL and only reference properties from the event schema (validated at registration).
   */
  condition?: string;
}

/**
 * User-facing definition for a workflow trigger.
 * Used by the UI to display trigger information (title, description, icon, event schema, documentation).
 * Extends the server contract (id + eventSchema) with UI-only fields.
 *
 * @example Definition with documentation and snippets (aligned with steps pattern)
 * {
 *   id: 'example.my_trigger',
 *   title: 'My Trigger',
 *   description: 'Fired when something happens.',
 *   eventSchema: z.object({ severity: z.string(), message: z.string() }),
 *   documentation: {
 *     details: 'Filter when this workflow runs using KQL on event properties.',
 *     examples: ['## Match high severity\n```yaml\ntriggers:\n  - type: example.my_trigger\n    with:\n      condition: \'event.severity: "high"\'\n```'],
 *   },
 *   snippets: { condition: 'event.severity: "high"' },
 * }
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
   * Documentation (details + examples), aligned with step definitions.
   */
  documentation?: TriggerDocumentation;

  /**
   * Pre-filled values for snippet insertion (e.g. with.condition).
   */
  snippets?: TriggerSnippets;
}
