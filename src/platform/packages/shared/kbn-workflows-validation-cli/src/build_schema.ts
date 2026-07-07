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

let cachedLooseSchema: z.ZodType | undefined;
let cachedStrictSchema: z.ZodType | undefined;

const buildConnectors = () => [...getAllStaticConnectors(), ...getExtensionStepContracts()];

/**
 * Builds (and caches) the workflow validation Zod schema.
 *
 * @param strict When false (default) the schema uses passthrough mode — unknown
 *   top-level keys (e.g. `template-metadata`) are silently accepted. When true,
 *   the schema rejects any key that is not explicitly defined.
 */
export const buildWorkflowSchema = ({ strict = false }: { strict?: boolean } = {}): z.ZodType => {
  if (strict) {
    if (cachedStrictSchema) return cachedStrictSchema;
    cachedStrictSchema = generateYamlSchemaFromConnectors(buildConnectors(), [], false);
    return cachedStrictSchema;
  }
  if (cachedLooseSchema) return cachedLooseSchema;
  // loose=true: passthrough schema tolerates unknown top-level keys (e.g. template-metadata).
  cachedLooseSchema = generateYamlSchemaFromConnectors(buildConnectors(), [], true);
  return cachedLooseSchema;
};
