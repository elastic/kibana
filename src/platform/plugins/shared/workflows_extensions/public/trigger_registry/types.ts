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
 * User-facing definition for a workflow trigger.
 * Used by the UI to display trigger information (title, description, icon, event schema, examples).
 * Extends the server contract (id + eventSchema) with UI-only fields.
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
}
