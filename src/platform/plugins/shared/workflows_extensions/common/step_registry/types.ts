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
 * Which workflows a custom step is meant for:
 * - `open`: any workflow. The editor suggests it.
 * - `internal`: the owner's managed workflows. Other workflows can still use it at their
 *   own risk: the editor doesn't suggest it and shows a warning when they use it.
 * - `managed_only`: managed workflows only. The editor doesn't suggest it and reports an
 *   error when another workflow uses it, so that workflow can't be enabled.
 */
export type StepExposure = 'open' | 'internal' | 'managed_only';

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
  /** Which workflows the step is meant for. Defaults to `open`. See {@link StepExposure}. */
  exposure?: StepExposure;
}
