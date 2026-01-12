/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepPropertyHandler } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../common';

/**
 * Helper function to create a PublicStepDefinition with automatic type inference.
 * This ensures that the editorHandlers' types are correctly inferred
 * from the inputSchema and configSchema without needing explicit type annotations.
 *
 **/
export function createPublicStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
>(
  definition: PublicStepDefinition<Input, Output, Config>
): PublicStepDefinition<Input, Output, Config> {
  return definition;
}

/**
 * User-facing metadata for a workflow step.
 * This is used by the UI to display step information (label, description, icon, schemas, documentation).
 */
export interface PublicStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> extends CommonStepDefinition<Input, Output, Config> {
  /**
   * User-facing label/title for this step type.
   * Displayed in the UI when selecting or viewing steps.
   */
  label: string;

  /**
   * User-facing description of what this step does.
   * Displayed as help text or in tooltips.
   */
  description?: string;

  /**
   * Icon type from EUI icon library.
   * Used to visually represent this step type in the UI.
   * kibana icon will be used if not provided
   * TODO: add support for EuiIconType
   */
  icon?: React.ComponentType;

  /**
   * Documentation for the step, including details, and examples.
   */
  documentation?: StepDocumentation;

  /**
   * The catalog under which the step is displayed in the actions menu
   * Default value is `kibana`
   */
  actionsMenuGroup?: ActionsMenuGroup;

  /**
   * Property handlers for the step.
   */
  editorHandlers?: {
    config?: {
      [K in FlattenPaths<z.infer<Config>>]?: StepPropertyHandler<PathValue<z.infer<Config>, K>>;
    };
    input?: {
      [K in FlattenPaths<z.infer<Input>>]?: StepPropertyHandler<PathValue<z.infer<Input>, K>>;
    };
    dynamicSchema: {
      /**
       * Dynamic Zod schema for validating step output based on input.
       * Allows for more flexible output structure based on the specific input provided.
       * @param input The input data for the step.
       * @returns A Zod schema defining structure and validation rules for the output of the step.
       */
      getOutputSchema?: (params: {
        input: z.infer<Input>;
        config: z.infer<Config>;
      }) => z.ZodType<z.infer<Output>>;
    };
  };
}

/**
 * The catalog under which the step is displayed in the actions menu
 */
export enum ActionsMenuGroup {
  elasticsearch = 'elasticsearch',
  external = 'external',
  ai = 'ai',
  kibana = 'kibana',
  data = 'data',
}

/**
 * Documentation information for a workflow step.
 */
export interface StepDocumentation {
  /**
   * Detailed description with usage examples (markdown supported)
   * @example "This step allows you to set variables that can be accessed in subsequent steps via `{{ steps.stepName.variableName }}`"
   */
  details?: string;

  /**
   * External documentation URL
   * @example "https://docs.example.com/custom-steps/setvar"
   */
  url?: string;

  /**
   * Usage examples in YAML format
   * @example
   * ```yaml
   * - name: myStep
   *   type: setvar
   *   with:
   *     variables:
   *       x: 10
   * ```
   */
  examples?: string[];
}

// Utility type to flatten nested object paths with dot notation
type FlattenPaths<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? FlattenPaths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

// Extract value type from a dot-path
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;
