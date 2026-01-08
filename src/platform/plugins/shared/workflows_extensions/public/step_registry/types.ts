/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../common';

/**
 * User-facing metadata for a workflow step.
 * This is used by the UI to display step information (label, description, icon, schemas, documentation).
 */
export interface PublicStepDefinition<
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
  ConfigSchema extends z.ZodObject = z.ZodObject
> extends CommonStepDefinition<InputSchema, OutputSchema, ConfigSchema> {
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
   * Dynamic Zod schema for validating step output based on input.
   * Allows for more flexible output structure based on the specific input provided.
   * @param input The input data for the step.
   * @returns A Zod schema defining structure and validation rules for the output of the step.
   */
  dynamicOutputSchema?:
    | ((params: {
        input: z.infer<InputSchema>;
        config: z.infer<ConfigSchema>;
      }) => z.ZodType<z.infer<OutputSchema>>)
    | undefined;
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
