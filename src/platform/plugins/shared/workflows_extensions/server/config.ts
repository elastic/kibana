/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type {
  WorkflowsExtensionsConfig,
  WorkflowsExtensionsExperimentalStepsConfig,
  WorkflowsExtensionsExperimentalStepsInputConfig,
} from '../common/experimental_steps_config';
import { resolveExperimentalStepsConfig } from '../common/experimental_steps_config';

export type {
  WorkflowsExtensionsConfig,
  WorkflowsExtensionsExperimentalStepsConfig,
  WorkflowsExtensionsExperimentalStepsInputConfig,
};
export { resolveExperimentalStepsConfig };

const experimentalStepsSchema = schema.object({
  javaScriptStep: schema.boolean({ defaultValue: false }),
});

const experimentalStepsInputSchema = schema.oneOf([schema.boolean(), experimentalStepsSchema], {
  defaultValue: false,
});

const configSchema = schema.object({
  experimentalSteps: experimentalStepsInputSchema,
});

export const config: PluginConfigDescriptor<WorkflowsExtensionsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    experimentalSteps: true,
  },
};
