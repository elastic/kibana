/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

/**
 * Common step definition fields shared between server and public.
 * Extends BaseStepDefinition from @kbn/workflows with the same generic schema triple.
 * Input and output types are automatically inferred from the schemas.
 */
export interface CommonStepDefinition<
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
  ConfigSchema extends z.ZodObject = z.ZodObject
> extends BaseStepDefinition<InputSchema, OutputSchema, ConfigSchema> {
  /**
   * Marks the step as internal: it exists to support the owner's managed workflows.
   * Users can still use it in their own workflows, at their own risk: the editor
   * doesn't suggest it and shows a warning when a workflow that isn't managed uses it.
   */
  internal?: boolean;

  /**
   * Restricts the step to managed workflows. The editor doesn't suggest it and
   * reports an error when a workflow that isn't managed uses it, so that workflow
   * can't be enabled. Implies `internal`.
   */
  managedOnly?: boolean;
}
