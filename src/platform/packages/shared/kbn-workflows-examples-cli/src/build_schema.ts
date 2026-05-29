/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { generateYamlSchemaFromConnectors, getAllStaticConnectors } from '@kbn/workflows';
import { getExtensionStepContracts } from './extension_step_definitions';

let cachedSchema: z.ZodType | undefined;

export const buildWorkflowSchema = (): z.ZodType => {
  if (cachedSchema) return cachedSchema;
  cachedSchema = generateYamlSchemaFromConnectors(
    [...getAllStaticConnectors(), ...getExtensionStepContracts()],
    [],
    true
  );
  return cachedSchema;
};
