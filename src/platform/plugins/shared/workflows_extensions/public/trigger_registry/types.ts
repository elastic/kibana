/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../../common/trigger_registry/types';

/**
 * Helper function to create a PublicTriggerDefinition with automatic type inference.
 * This ensures that the config type is correctly inferred from the configSchema
 * without needing explicit type annotations.
 */
export function createPublicTriggerDefinition<Config extends z.ZodType = z.ZodType>(
  definition: PublicTriggerDefinition<Config>
): PublicTriggerDefinition<Config> {
  return definition;
}

/**
 * User-facing metadata for a workflow trigger.
 * This is used by the UI to display trigger information (label, description, icon, schemas, documentation).
 */
export interface PublicTriggerDefinition<Config extends z.ZodType = z.ZodType>
  extends CommonTriggerDefinition<Config> {
  /**
   * User-facing label/title for this trigger type.
   * Displayed in the UI when selecting or viewing triggers.
   */
  label: string;

  /**
   * User-facing description of what this trigger does.
   * Displayed as help text or in tooltips.
   */
  description?: string;

  /**
   * Icon type from EUI icon library.
   * Used to visually represent this trigger type in the UI.
   * Kibana icon will be used if not provided.
   */
  icon?: React.ComponentType;

  /**
   * Documentation for the trigger, including details and examples.
   */
  documentation?: TriggerDocumentation;
}

/**
 * Documentation information for a workflow trigger.
 */
export interface TriggerDocumentation {
  /**
   * Detailed description with usage examples (markdown supported)
   * @example "This trigger fires when a stream definition is created or updated."
   */
  details?: string;

  /**
   * External documentation URL
   * @example "https://docs.example.com/triggers/stream-change"
   */
  url?: string;

  /**
   * Usage examples in YAML format
   * @example
   * ```yaml
   * triggers:
   *   - type: streams.upsertStream
   *     with:
   *       stream: "logs-*"
   *       changeTypes: ["mapping", "processing"]
   * ```
   */
  examples?: string[];
}
