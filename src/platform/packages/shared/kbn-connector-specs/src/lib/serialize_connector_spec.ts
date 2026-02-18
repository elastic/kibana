/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';

export function serializeConnectorSpec(spec: ConnectorSpec) {
  const combinedZodSchema = z.object({
    config: spec.schema ?? z.object({}),
    secrets: generateSecretsSchemaFromSpec(spec.auth),
  });

  const jsonSchema = z.toJSONSchema(combinedZodSchema);

  return {
    metadata: spec.metadata,
    schema: jsonSchema as Record<string, unknown>,
  };
}
