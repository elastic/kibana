/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const experimentalStepsSchema = schema.object({
  javaScriptStep: schema.boolean({ defaultValue: false }),
});

const experimentalStepsInputSchema = schema.oneOf(
  [schema.boolean(), experimentalStepsSchema],
  { defaultValue: false }
);

const configSchema = schema.object({
  experimentalSteps: experimentalStepsInputSchema,
});

export type WorkflowsExtensionsExperimentalStepsConfig = TypeOf<typeof experimentalStepsSchema>;
export type WorkflowsExtensionsExperimentalStepsInputConfig = TypeOf<
  typeof experimentalStepsInputSchema
>;
export type WorkflowsExtensionsConfig = TypeOf<typeof configSchema>;

export const resolveExperimentalStepsConfig = (
  experimentalSteps: WorkflowsExtensionsExperimentalStepsInputConfig
): WorkflowsExtensionsExperimentalStepsConfig => {
  if (typeof experimentalSteps === 'boolean') {
    return {
      javaScriptStep: experimentalSteps,
    };
  }

  return experimentalSteps;
};

export const config: PluginConfigDescriptor<WorkflowsExtensionsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    experimentalSteps: true,
  },
};
