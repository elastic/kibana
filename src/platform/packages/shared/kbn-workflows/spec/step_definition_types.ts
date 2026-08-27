/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { StepDeprecationInfo } from './deprecated_step_metadata';
import type { StabilityLevel } from '../types/v1';

export enum StepCategory {
  Elasticsearch = 'elasticsearch',
  External = 'external',
  Ai = 'ai',
  Kibana = 'kibana',
  KibanaCases = 'kibana.cases',
  KibanaEntityStore = 'kibana.entityStore',
  KibanaSecurity = 'kibana.security',
  Data = 'data',
  FlowControl = 'flowControl',
}

export const StepCategories = Object.values(StepCategory) as StepCategory[];

/**
 * Documentation information for a workflow step.
 *
 * Together with Zod `.describe()` on `inputSchema` / `configSchema` / `outputSchema`
 * fields, this is the source of truth for generated reference docs:
 * - `details` — intro prose (not the parameter table)
 * - schema `.describe()` — Parameter / Type / Required / Description table
 *   (`configSchema` = YAML top-level, `inputSchema` = `with:`)
 * - `outputSchema` `.describe()` — output-shape table
 * - `examples` — titled YAML snippets (`## Title` + fenced yaml)
 * - `notes` — warnings and gotchas rendered after the schema
 *
 */
export interface StepDocumentation {
  /**
   * Detailed description with usage notes (markdown supported).
   * Keep parameter lists out of here — put them on Zod `.describe()` instead.
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

  /**
   * Warnings and gotchas rendered after the schema table. Each string becomes
   * one bullet in a Notes callout.
   *
   * @example
   * notes: [
   *   'Always set fallbackCategory in production. Without a fallback, a confused model can fail the step.',
   * ]
   *
   * Renders as:
   * ```md
   * ::::{note}
   * - Always set fallbackCategory in production. Without a fallback, a confused model can fail the step.
   * ::::
   * ```
   */
  notes?: string[];
}

/**
 * Base interface for all step definitions across the workflows system.
 * Both built-in steps (if, foreach, wait, data.set) and registry-based steps
 * (connector steps, AI steps, etc.) extend this interface.
 */
export interface BaseStepDefinition<
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
  ConfigSchema extends z.ZodObject = z.ZodObject
> {
  /**
   * Unique identifier for this step type.
   * Should follow a namespaced format (e.g., "ai.prompt", "data.set", "elasticsearch.search").
   */
  id: string;

  /**
   * User-facing label/title for this step type.
   * Displayed in the UI when selecting or viewing steps.
   */
  label: string;

  /**
   * Human-readable description of what this step does.
   */
  description: string;

  /**
   * Category grouping for this step type.
   */
  category: StepCategory;

  /**
   * Zod schema for validating step input (the `with` block in YAML).
   * Put `.describe()` on every field — generated docs use it for the parameter table
   * (`Location: with`).
   */
  inputSchema: InputSchema;

  /**
   * Zod schema for validating step output.
   * Put `.describe()` on every field, including when a field is only present
   * under certain inputs (e.g. "Present when allowMultipleCategories is true").
   */
  outputSchema: OutputSchema;

  /**
   * Zod schema for validating step config properties.
   * Defines config properties that appear at the step level (outside the `with` block).
   * Example: `connector-id` for connector steps, `condition` for if steps.
   * Put `.describe()` on every field — generated docs use it for the parameter table
   * (`Location: top level`).
   */
  configSchema?: ConfigSchema;

  /**
   * Documentation for the step, including details and examples.
   */
  documentation?: StepDocumentation;

  /**
   * API stability level for this step (e.g. 'tech_preview', 'beta', 'stable').
   * Built-in steps: omit means stable (no badge). Extension-registered steps: omit
   * defaults to tech_preview in the UI; set 'stable' explicitly to graduate.
   */
  stability?: StabilityLevel;

  /**
   * Deprecation metadata for this step type.
   * Deprecated steps remain valid for existing workflows, but should not be
   * suggested for new workflows.
   */
  deprecation?: StepDeprecationInfo;
}
