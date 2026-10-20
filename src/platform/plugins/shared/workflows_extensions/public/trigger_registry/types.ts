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

export type { TriggerDocumentation, TriggerSnippets } from '../../common/trigger_registry/types';

/**
 * User-facing definition for a workflow trigger.
 * Spreads the shared common contract and adds UI-only presentation (icon).
 *
 * @example
 * {
 *   ...commonMyTriggerDefinition,
 *   icon: React.lazy(() => import('...')),
 * }
 */
export interface PublicTriggerDefinition<EventSchema extends z.ZodType = z.ZodType>
  extends CommonTriggerDefinition<EventSchema> {
  /**
   * Used to visually represent this trigger in the UI.
   */
  icon?: React.ComponentType;
}
